import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAppUrl } from "@/config/app-url";
import { checkRateLimit, recordAttempt } from "@/lib/rate-limit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LegalFooter } from "@/components/LegalFooter";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { allowed, retryAfterMs } = checkRateLimit("reset", 3, 5 * 60 * 1000);
      if (!allowed) {
        const mins = Math.ceil(retryAfterMs / 60000);
        toast.error("Too many reset requests.", {
          description: `Please try again in ${mins} minute${mins > 1 ? "s" : ""}.`,
        });
        return;
      }

      emailSchema.parse({ email: email.trim() });
      recordAttempt("reset");

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getAppUrl("/reset-password"),
      });

      if (error) {
        console.error("Password reset error:", error);
      }

      // Always show success to prevent email enumeration
      setSubmitted(true);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => toast.error(err.message));
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

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

          <Card className="shadow-xl">
            <CardHeader className="space-y-1 text-center pb-2">
              <div className="flex justify-center mb-5">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  {submitted ? (
                    <CheckCircle2 className="h-7 w-7 text-primary" strokeWidth={1.5} />
                  ) : (
                    <Mail className="h-7 w-7 text-primary" strokeWidth={1.5} />
                  )}
                </div>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                {submitted ? "Check Your Email" : "Reset Password"}
              </CardTitle>
              <CardDescription className="text-base">
                {submitted
                  ? "If an account exists with that email, a password reset link has been sent."
                  : "Enter your email and we'll send you a reset link"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {submitted ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Didn't receive an email? Check your spam folder or try again.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => { setSubmitted(false); setEmail(""); }}
                  >
                    Try another email
                  </Button>
                  <Link to="/auth" className="block">
                    <Button variant="ghost" className="w-full h-11 text-primary">
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
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

                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <LegalFooter />
    </div>
  );
}
