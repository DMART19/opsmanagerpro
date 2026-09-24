import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getAppUrl } from "@/config/app-url";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LegalFooter } from "@/components/LegalFooter";
import {
  clearPendingVerificationEmail,
  getPendingVerificationEmail,
  isEmailVerified,
  setPendingVerificationEmail,
} from "@/lib/email-verification";
import { checkRateLimit, formatCooldown, recordAttempt } from "@/lib/rate-limit";
import { planAwareRedirect } from "@/lib/pending-plan";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const pendingEmail = getPendingVerificationEmail();
      const { data: { session } } = await supabase.auth.getSession();
      const sessionEmail = session?.user?.email ?? "";

      if (!active) return;

      if (session?.user && isEmailVerified(session.user)) {
        clearPendingVerificationEmail();
        navigate(planAwareRedirect("/onboarding"), { replace: true });
        return;
      }

      const nextEmail = sessionEmail || pendingEmail;
      setEmail(nextEmail);
      setLoading(false);
    };

    hydrate();
    return () => {
      active = false;
    };
  }, [navigate]);

  const maskedEmail = useMemo(() => {
    if (!email || !email.includes("@")) return "your email";
    const [local, domain] = email.split("@");
    const prefix = local.slice(0, 2);
    return `${prefix}${"•".repeat(Math.max(local.length - 2, 2))}@${domain}`;
  }, [email]);

  const handleResend = async () => {
    if (!email) {
      toast.error("No pending email address found.", {
        description: "Please choose Change email address and sign up again.",
      });
      return;
    }

    const { allowed, retryAfterMs } = checkRateLimit("verify-email-resend", 1, 60_000);
    if (!allowed) {
      toast.error("Please wait before requesting another email.", {
        description: `You can resend in ${formatCooldown(retryAfterMs)}.`,
      });
      return;
    }

    setResending(true);
    try {
      console.log("[verify-email] resend requested", { email });

      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: getAppUrl("/auth/confirm"),
        },
      });

      if (error) {
        console.error("[verify-email] resend failed", error);
        toast.error(error.message);
        return;
      }

      recordAttempt("verify-email-resend", 60_000);
      setPendingVerificationEmail(email);
      toast.success("Confirmation email resent.", {
        description: "Please check your inbox for the latest activation link.",
      });
    } catch (error) {
      console.error("[verify-email] resend error", error);
      toast.error("We couldn't resend the confirmation email.");
    } finally {
      setResending(false);
    }
  };

  const handleChangeEmail = async () => {
    clearPendingVerificationEmail();
    await supabase.auth.signOut().catch(() => undefined);
    navigate("/auth?mode=signup", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-fade-in">Loading verification status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/3 via-background to-secondary/3">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md animate-fade-in">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>

          <Card className="shadow-xl border-border/50">
            <CardHeader className="space-y-1 text-center pb-2">
              <div className="flex justify-center mb-5">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Mail className="h-7 w-7 text-primary" strokeWidth={1.5} />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">Check your email</CardTitle>
              <CardDescription className="text-base">
                We sent a confirmation link to your email. Please click the link to activate your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-5">
              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground text-center">
                Sending to <span className="font-medium text-foreground">{maskedEmail}</span>
              </div>

              <div className="space-y-3">
                <Button className="w-full h-11 text-base font-medium" onClick={handleResend} disabled={resending}>
                  {resending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    "Resend confirmation email"
                  )}
                </Button>
                <Button variant="outline" className="w-full h-11 text-base font-medium" onClick={handleChangeEmail}>
                  Change email address
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
