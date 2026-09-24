import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, MailWarning } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LegalFooter } from "@/components/LegalFooter";
import { clearPendingVerificationEmail, isEmailVerified } from "@/lib/email-verification";
import { planAwareRedirect } from "@/lib/pending-plan";

export default function AuthConfirm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    const confirm = async () => {
      const token = params.get("token") || params.get("token_hash") || "";
      const rawType = params.get("type") || "signup";
      const type = rawType === "email" ? "signup" : rawType;

      try {
        console.log("[auth-confirm] confirmation requested", {
          type,
          hasToken: Boolean(token),
        });

        if (token) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type as any,
          });

          if (error) {
            throw error;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || !isEmailVerified(session.user)) {
          throw new Error("Your confirmation link is invalid or has expired.");
        }

        clearPendingVerificationEmail();
        toast.success("Email confirmed.", {
          description: "Your account is now active.",
        });
        navigate(planAwareRedirect("/dashboard"), { replace: true });
      } catch (error) {
        console.error("[auth-confirm] confirmation failed", error);
        if (!active) return;
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Unable to confirm email.");
      }
    };

    confirm();
    return () => {
      active = false;
    };
  }, [navigate, params]);

  if (status === "verifying") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-fade-in">Confirming your email...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/3 via-background to-secondary/3">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md animate-fade-in">
          <Link
            to="/verify-email"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to verification
          </Link>

          <Card className="shadow-xl border-border/50">
            <CardHeader className="space-y-1 text-center pb-2">
              <div className="flex justify-center mb-5">
                <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <MailWarning className="h-7 w-7 text-destructive" strokeWidth={1.5} />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">Verification link expired</CardTitle>
              <CardDescription className="text-base">{errorMessage}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <Button className="w-full h-11 text-base font-medium" onClick={() => navigate("/verify-email", { replace: true })}>
                Try another confirmation email
              </Button>
              <Button variant="outline" className="w-full h-11 text-base font-medium" onClick={() => navigate("/auth?mode=signup", { replace: true })}>
                Use another email address
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
