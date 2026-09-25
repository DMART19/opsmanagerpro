import { useState, useEffect, useRef, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { trackFriction } from "@/lib/track-friction";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { parsePlanId, setPendingPlan, planAwareRedirect, safeInternalPath } from "@/lib/pending-plan";
import { getAppUrl } from "@/config/app-url";
import { supabase } from "@/integrations/supabase/client";
import { consumePendingInvite } from "@/pages/JoinWorkspace";
import { checkPasswordBreached, BREACHED_PASSWORD_MESSAGE } from "@/lib/password-security";
import { checkRateLimit, recordAttempt, clearAttempts, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LegalFooter } from "@/components/LegalFooter";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { MFAChallengeDialog } from "@/components/auth/MFAChallengeDialog";
import { hasVerifiedMfa, currentSessionIsAal2 } from "@/lib/auth/mfa";
import { clearPendingVerificationEmail, isEmailVerified, setPendingVerificationEmail } from "@/lib/email-verification";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { z } from "zod";
import { trackEvent } from "@/lib/track-event";
import type { Database } from "@/integrations/supabase/types";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
});

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

type ErrorLogArgs = Database["public"]["Functions"]["upsert_error_log"]["Args"];

/**
 * Ensures workspace records exist, with timeout protection.
 * Returns the redirect path.
 */
async function resolvePostLoginRedirect(userId: string, isNewSignup = false): Promise<string> {
  // Accept pending workspace invite if one exists
  try {
    const pendingToken = consumePendingInvite();
    if (pendingToken) {
      await supabase.rpc("accept_workspace_invite", {
        p_token: pendingToken,
        p_user_id: userId,
      });
    }
  } catch (error: unknown) {
    console.warn("Pending invite acceptance failed:", errorMessage(error));
  }

  // Check super_admin role
  try {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (roleData) return "/admin/ops-center";
  } catch {
    // Non-critical, proceed
  }

  // Ensure workspace integrity with 3s timeout
  try {
    const integrityPromise = supabase.rpc("ensure_workspace_integrity", { p_user_id: userId });
    await Promise.race([
      integrityPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
  } catch (error: unknown) {
    const message = errorMessage(error);
    console.warn("Workspace integrity check timed out or failed:", message);
    try {
      const errorLog = {
        p_user_id: userId,
        p_severity: "warning",
        p_message: `Workspace integrity check failed: ${message}`,
        p_stack_trace: null,
        p_page_route: "/auth",
        p_browser_info: navigator.userAgent,
        p_api_endpoint: null,
        p_api_status_code: null,
        p_request_method: null,
        p_error_hash: "workspace_integrity_failure",
      } as unknown as ErrorLogArgs;
      await supabase.rpc("upsert_error_log", errorLog);
    } catch { /* swallow */ }
  }

  // Record login analytics
  try {
    await supabase
      .from("profiles")
      .update({
        last_login_at: new Date().toISOString(),
      })
      .eq("id", userId);

    // Increment login_count via raw increment
    await supabase.rpc("increment_login_count", { p_user_id: userId }).catch(() => {});
  } catch {
    // Non-critical
  }

  // Always go to dashboard — no onboarding redirect
  return "/dashboard";
}

export default function Auth() {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [mfaChallengeUser, setMfaChallengeUser] = useState<User | null>(null);
  const [signupSuccessEmail, setSignupSuccessEmail] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const redirectingRef = useRef(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<ReturnType<typeof parsePlanId>>(null);

  const beginPostLoginRedirect = useCallback((userId: string) => {
    if (redirectingRef.current) return;

    redirectingRef.current = true;
    setAuthReady(false);
    setStatusMessage("Signing you in...");

    const preparingTimer = setTimeout(() => {
      setStatusMessage("Preparing your workspace...");
    }, 3000);

    // Honor ?next= override (e.g. landing-page "See how it works" → /dashboard?tour=1).
    // Only same-origin, path-relative destinations are accepted.
    let nextOverride: string | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      nextOverride = safeInternalPath(params.get("next"));
    } catch {
      nextOverride = null;
    }

    // If a plan was chosen before signup, land on billing with it preselected.
    // This never starts a subscription — it only preserves the choice.
    const planPath = nextOverride ? null : planAwareRedirect("");
    const fallbackPath = nextOverride || planPath || "/dashboard";

    const forceRedirectTimer = setTimeout(() => {
      navigate(fallbackPath, { replace: true });
    }, 6000);

    void (async () => {
      try {
        const path = await resolvePostLoginRedirect(userId);
        clearPendingVerificationEmail();
        navigate(nextOverride || planPath || path, { replace: true });
      } catch (error) {
        console.error("Post-login redirect failed:", error);
        toast.error("We're setting up your workspace. Please refresh.");
        navigate(fallbackPath, { replace: true });
      } finally {
        clearTimeout(preparingTimer);
        clearTimeout(forceRedirectTimer);
      }
    })();
  }, [navigate]);

  const handleAuthenticatedUser = useCallback((user: User) => {
    if (!isEmailVerified(user)) {
      if (user.email) {
        setPendingVerificationEmail(user.email);
      }
      redirectingRef.current = false;
      setStatusMessage("");
      setAuthReady(true);
      navigate("/verify-email", { replace: true });
      return;
    }

    window.setTimeout(() => void trackEvent("signup_completed"), 0);

    // Phase 2: gate sign-in on MFA challenge when user has a verified factor
    // and the current session has not yet satisfied aal2.
    void (async () => {
      try {
        const [hasMfa, atAal2] = await Promise.all([
          hasVerifiedMfa(),
          currentSessionIsAal2(),
        ]);
        if (hasMfa && !atAal2) {
          setMfaChallengeUser(user);
          setAuthReady(true);
          setStatusMessage("");
          redirectingRef.current = false;
          return;
        }
      } catch {
        // If we can't check MFA, fail open to login (Supabase still enforces aal2 server-side for MFA-only policies).
      }
      beginPostLoginRedirect(user.id);
    })();
  }, [beginPostLoginRedirect, navigate]);

  // Read mode + selected plan from URL params (also on refresh / back-forward)
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signin") setIsLogin(true);
    else if (mode === "signup") setIsLogin(false);

    const planId = parsePlanId(searchParams.get("plan"));
    if (planId) {
      setSelectedPlan(planId);
      setPendingPlan(planId);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
        ]);

        if (!isMounted) return;

        const session = sessionResult?.data?.session ?? null;
        if (session?.user) {
          handleAuthenticatedUser(session.user);
        } else {
          setAuthReady(true);
        }
      } catch {
        if (isMounted) setAuthReady(true);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        handleAuthenticatedUser(session.user);
        return;
      }

      redirectingRef.current = false;
      setStatusMessage("");
      setAuthReady(true);
    });

    checkSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [handleAuthenticatedUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setLoginError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        // Rate limit only applies to login (failed attempts)
        const { allowed, retryAfterMs } = checkRateLimit("login", 5, 10 * 60_000);
        if (!allowed) {
          const mins = Math.ceil(retryAfterMs / 60000);
          toast.error(RATE_LIMIT_MESSAGE, {
            description: `Try again in ${mins} minute${mins > 1 ? "s" : ""}.`,
          });
          return;
        }

        loginSchema.parse({ email, password });

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            setPendingVerificationEmail(email);
            toast.error("Please verify your email before signing in.");
            navigate("/verify-email", { replace: true });
            return;
          }

          // Record failed attempt AFTER the failure
          recordAttempt("login", 10 * 60_000);
          const msg = "Invalid email or password. Please check your details and try again.";
          setLoginError(msg);
          toast.error(msg);
          trackFriction("validation_error", "/auth", "login_failed", { reason: "invalid_credentials" });
          import("@/lib/log-security-event").then(({ logSecurityEvent }) => {
            logSecurityEvent({
              event_type: "failed_login",
              severity: "medium",
              details: { email, reason: "invalid_credentials" },
              page_route: "/auth",
            });
          });
          return;
        }

        if (data.user) {
          // Successful login — reset failed attempt counter
          clearAttempts("login");
          toast.success("Welcome back!");
          handleAuthenticatedUser(data.user);
        }
      } else {
        // Signup rate limiting
        const { allowed, retryAfterMs } = checkRateLimit("signup");
        if (!allowed) {
          const mins = Math.ceil(retryAfterMs / 60000);
          toast.error("Too many signup attempts.", {
            description: `Try again in ${mins} minute${mins > 1 ? "s" : ""}.`,
          });
          return;
        }

        signupSchema.parse({ email, password });
        // Check for breached password before signup
        const isBreached = await checkPasswordBreached(password);
        if (isBreached) {
          toast.error(BREACHED_PASSWORD_MESSAGE);
          return;
        }

        recordAttempt("signup");

        const normalizedEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: getAppUrl("/auth/confirm"),
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please sign in instead.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        if (data.user) {
          console.log("[auth] signup created", {
            userId: data.user.id,
            email: normalizedEmail,
            emailVerified: isEmailVerified(data.user),
          });
          setPendingVerificationEmail(normalizedEmail);
          toast.success("Account created — check your email to verify.", {
            description: "You'll need to verify your email before signing in.",
            duration: 8000,
          });
          setSignupSuccessEmail(normalizedEmail);
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => toast.error(err.message));
        trackFriction("validation_error", "/auth", isLogin ? "login_validation" : "signup_validation", { 
          errors: error.errors.map(e => e.message) 
        });
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /** Keep the URL in sync with the visible mode so refresh/share/back behave. */
  const applyMode = (login: boolean) => {
    setIsLogin(login);
    setPassword("");
    setLoginError(null);

    const next = new URLSearchParams(searchParams);
    next.set("mode", login ? "signin" : "signup");
    // Preserve the plan choice across mode switches
    if (selectedPlan) next.set("plan", selectedPlan);
    setSearchParams(next, { replace: true });
  };

  const handleModeSwitch = () => applyMode(!isLogin);

  // Show progress message instead of infinite skeleton
  if (!authReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-fade-in">
          {statusMessage || "Signing you in..."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/3 via-background to-secondary/3">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md animate-fade-in">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        
          <Card className="shadow-xl border-border/50">
            {signupSuccessEmail ? (
              <>
                <CardHeader className="space-y-1 text-center pb-2">
                  <div className="flex justify-center mb-5">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Shield className="h-7 w-7 text-primary" strokeWidth={1.5} />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold tracking-tight">Check your inbox</CardTitle>
                  <CardDescription className="text-base">
                    We sent a verification link to{" "}
                    <span className="font-medium text-foreground">{signupSuccessEmail}</span>. Open the email and
                    verify your account to continue setting up your workspace.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3" role="status" aria-live="polite">
                  <Button
                    type="button"
                    className="w-full h-11"
                    onClick={() => navigate("/verify-email", { replace: true })}
                  >
                    I've verified — continue
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-11"
                    onClick={() => {
                      setSignupSuccessEmail(null);
                      applyMode(true);
                    }}
                  >
                    Back to Sign In
                  </Button>
                </CardContent>
              </>
            ) : (
              <>
            <CardHeader className="space-y-1 text-center pb-2">
              <div className="flex justify-center mb-5">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Shield className="h-7 w-7 text-primary" strokeWidth={1.5} />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                {isLogin ? "Welcome Back" : "Get Started"}
              </CardTitle>
              <CardDescription className="text-base">
                {isLogin 
                  ? "Enter your credentials to sign in" 
                  : "Create your account"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {loginError && isLogin && (
                    <div
                      role="alert"
                      aria-live="assertive"
                      className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm px-3 py-2"
                    >
                      {loginError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                    {isLogin && (
                      <Link
                        to="/forgot-password"
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot your password?
                      </Link>
                    )}
                    {!isLogin && <PasswordStrengthIndicator password={password} />}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 text-base font-medium" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isLogin ? "Signing in..." : "Creating account..."}
                      </>
                    ) : (
                      <>
                        {isLogin ? "Sign In" : "Create Account"}
                      </>
                    )}
                  </Button>
                </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={handleModeSwitch}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                  disabled={isLoading}
                >
                  {isLogin 
                    ? "Don't have an account? " 
                    : "Already have an account? "}
                  <span className="text-primary font-medium hover:underline">
                    {isLogin ? "Sign up" : "Sign in"}
                  </span>
                </button>
              </div>
            </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
      
      <LegalFooter />
      <MFAChallengeDialog
        open={Boolean(mfaChallengeUser)}
        onVerified={() => {
          const u = mfaChallengeUser;
          setMfaChallengeUser(null);
          if (u) beginPostLoginRedirect(u.id);
        }}
        onCancel={() => setMfaChallengeUser(null)}
      />
    </div>
  );
}
