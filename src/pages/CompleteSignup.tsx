import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { toast } from "sonner";
import { Loader2, Shield, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const completeSignupSchema = z.object({
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function CompleteSignup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    const checkAuth = async () => {
      // Wait briefly for auth state to settle after redirect
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        // Not authenticated — may still be processing the verification token
        // Listen for auth state change
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            setEmail(session.user.email || "");
            
            // Check if user already completed setup
            supabase
              .from("profiles")
              .select("display_name")
              .eq("id", session.user.id)
              .single()
              .then(({ data: profile }) => {
                if (profile?.display_name) {
                  navigate("/dashboard", { replace: true });
                } else {
                  setLoading(false);
                }
              });
            
            subscription.unsubscribe();
          }
        });

        // Timeout fallback — redirect to auth if no session after 10s
        setTimeout(() => {
          setLoading((prev) => {
            if (prev) {
              subscription.unsubscribe();
              navigate("/auth?mode=signup", { replace: true });
            }
            return prev;
          });
        }, 10000);
        
        return;
      }

      setEmail(session.user.email || "");

      // Check if user already completed setup
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", session.user.id)
        .single();

      if (profile?.display_name) {
        navigate("/dashboard", { replace: true });
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const result = completeSignupSchema.safeParse({ displayName, password, confirmPassword });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const key = err.path[0] as string;
        if (!errs[key]) errs[key] = err.message;
      });
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Session expired. Please try signing up again.");
        navigate("/auth?mode=signup", { replace: true });
        return;
      }

      const userId = session.user.id;

      // Set the user's password
      const { error: passwordError } = await supabase.auth.updateUser({
        password,
        data: { display_name: displayName.trim() },
      });

      if (passwordError) {
        toast.error(passwordError.message);
        return;
      }

      // Update profile with display name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("id", userId);

      if (profileError) {
        console.error("Profile update error:", profileError);
        // Non-fatal — password is set, continue
      }

      toast.success("Account created!", {
        description: "Let's finish setting up your workspace.",
        duration: 4000,
      });

      navigate("/setup", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-fade-in">
          Verifying your email...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/3 via-background to-secondary/3 p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-1.5 w-8 rounded-full bg-primary" />
          <div className="h-1.5 w-8 rounded-full bg-primary" />
          <div className="h-1.5 w-8 rounded-full bg-muted" />
        </div>

        <Card className="shadow-xl">
          <CardHeader className="space-y-1 text-center pb-2">
            <div className="flex justify-center mb-5">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Complete Your Account
            </CardTitle>
            <CardDescription className="text-base">
              Email verified! Set up your name and password.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Verified Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="complete-email">Email</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="complete-email"
                    type="email"
                    value={email}
                    readOnly
                    className="h-11 bg-muted/50 cursor-not-allowed flex-1"
                  />
                  <div className="flex items-center gap-1 text-primary shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Verified</span>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="complete-name">Your Name</Label>
                <Input
                  id="complete-name"
                  type="text"
                  placeholder="Jane Cooper"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (fieldErrors.displayName) setFieldErrors((p) => { const n = { ...p }; delete n.displayName; return n; });
                  }}
                  className={`h-11 ${fieldErrors.displayName ? "border-destructive" : ""}`}
                  disabled={submitting}
                  autoFocus
                />
                {fieldErrors.displayName && (
                  <p className="text-xs text-destructive">{fieldErrors.displayName}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="complete-password">Password</Label>
                <Input
                  id="complete-password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => { const n = { ...p }; delete n.password; return n; });
                  }}
                  className={`h-11 ${fieldErrors.password ? "border-destructive" : ""}`}
                  disabled={submitting}
                />
                {fieldErrors.password && (
                  <p className="text-xs text-destructive">{fieldErrors.password}</p>
                )}
                <PasswordStrengthIndicator password={password} />
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="complete-confirm-password">Confirm Password</Label>
                <Input
                  id="complete-confirm-password"
                  type="password"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors((p) => { const n = { ...p }; delete n.confirmPassword; return n; });
                  }}
                  className={`h-11 ${fieldErrors.confirmPassword ? "border-destructive" : ""}`}
                  disabled={submitting}
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          14-day free trial · No credit card required
        </p>
      </div>
    </div>
  );
}
