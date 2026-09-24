import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Key, LogOut, CheckCircle, Loader2, Shield, ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { checkPasswordBreached, BREACHED_PASSWORD_MESSAGE } from "@/lib/password-security";
import { toast } from "@/hooks/use-toast";
import { passwordSchema } from "@/lib/validation";
import { z } from "zod";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { MFAEnrollDialog } from "@/components/auth/MFAEnrollDialog";
import { StepUpAuthDialog } from "@/components/auth/StepUpAuthDialog";
import { useMfaStatus } from "@/hooks/use-mfa-status";
import { useStepUp } from "@/hooks/use-step-up";
import { useSuperAdmin } from "@/hooks/use-super-admin";
import { unenrollTotpFactor } from "@/lib/auth/mfa";
import { logSecurityEvent } from "@/lib/log-security-event";
import { validatePasswordPolicy } from "@/lib/auth/password-policy";
import {
  IDLE_TIMEOUT_MINUTES,
  ABSOLUTE_SESSION_HOURS,
  STEP_UP_MAX_AGE_MINUTES,
  REQUIRE_MFA_FOR_ADMINS,
  SENSITIVE_ACTIONS,
} from "@/config/security";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const SecurityTab = () => {
  const isMobile = useIsMobile();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [mfaEnrollOpen, setMfaEnrollOpen] = useState(false);
  const mfa = useMfaStatus();
  const stepUp = useStepUp();
  const { isSuperAdmin } = useSuperAdmin();
  const mfaWarningForAdmin =
    REQUIRE_MFA_FOR_ADMINS && isSuperAdmin && !mfa.loading && !mfa.enrolled;

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      passwordSchema.parse({
        currentPassword: "step-up",
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      const policy = validatePasswordPolicy(passwordForm.newPassword);
      if (!policy.ok) {
        toast({ title: "Weak password", description: policy.message, variant: "destructive" });
        return;
      }

      const isBreached = await checkPasswordBreached(passwordForm.newPassword);
      if (isBreached) {
        toast({ title: "Compromised Password", description: BREACHED_PASSWORD_MESSAGE, variant: "destructive" });
        return;
      }

      // Phase 2: require step-up before changing the password.
      await stepUp.require(SENSITIVE_ACTIONS.CHANGE_PASSWORD);
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) throw error;
      await logSecurityEvent({ event_type: "password_changed", severity: "medium" });
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      setChangePasswordOpen(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => toast({ title: "Validation Error", description: err.message, variant: "destructive" }));
      } else if (error instanceof Error && error.message === "Step-up cancelled") {
        // user closed step-up — silent
      } else {
        toast({ title: "Error", description: "Failed to update password. Please try again.", variant: "destructive" });
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogoutAllSessions = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut({ scope: "global" });
      toast({ title: "Logged out everywhere", description: "All sessions have been terminated." });
      window.location.href = "/auth";
    } catch {
      toast({ title: "Error", description: "Failed to log out other sessions.", variant: "destructive" });
      setLoggingOut(false);
    }
  };

  const handleDisableMfa = async (factorId: string) => {
    try {
      await stepUp.require(SENSITIVE_ACTIONS.CHANGE_MFA);
      await unenrollTotpFactor(factorId);
      await mfa.refresh();
      toast({ title: "MFA disabled", description: "Two-factor authentication has been removed." });
    } catch (err) {
      if (err instanceof Error && err.message === "Step-up cancelled") return;
      toast({ title: "Error", description: "Couldn't disable MFA. Try again.", variant: "destructive" });
    }
  };

  const PasswordFormContent = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="new-password">New Password</Label>
        <Input
          id="new-password"
          type="password"
          value={passwordForm.newPassword}
          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
          placeholder="Enter new password"
        />
        <p className="text-xs text-muted-foreground">12+ characters with uppercase, lowercase, number, and symbol</p>
        <PasswordStrengthIndicator password={passwordForm.newPassword} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={passwordForm.confirmPassword}
          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
          placeholder="Confirm new password"
        />
      </div>
    </div>
  );

  const PasswordFormActions = (
    <>
      <Button type="button" variant="outline" onClick={() => setChangePasswordOpen(false)} disabled={savingPassword}>Cancel</Button>
      <Button onClick={handleChangePassword} disabled={savingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}>
        {savingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
        Update Password
      </Button>
    </>
  );

  return (
    <div className="space-y-3">
      {mfaWarningForAdmin && (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 px-3 py-2.5 text-xs text-warning-foreground">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-warning shrink-0" />
          <div>
            <p className="font-medium text-warning">MFA is required for admins.</p>
            <p className="text-muted-foreground">
              Enroll a TOTP authenticator below to keep access to admin tools.
            </p>
          </div>
        </div>
      )}

      {/* Password & 2FA */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
          Authentication
        </h3>
        <Card className="divide-y divide-border/30">
          {/* Change Password */}
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <Key className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <Label className="text-sm font-medium">Password</Label>
                <p className="text-xs text-muted-foreground">Update your account password</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setChangePasswordOpen(true)}>
              Change
            </Button>
          </div>

          {/* 2FA */}
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              {mfa.enrolled ? (
                <ShieldCheck className="h-4 w-4 text-success shrink-0" />
              ) : (
                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0">
                <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                <p className="text-xs text-muted-foreground">
                  {mfa.loading
                    ? "Checking…"
                    : mfa.enrolled
                    ? "TOTP authenticator enrolled"
                    : "Add an authenticator app for stronger sign-in"}
                </p>
              </div>
            </div>
            {mfa.loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : mfa.enrolled ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-success/5 text-success border-success/20 text-[10px]">
                  Enabled
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/5"
                  onClick={() => {
                    const factor = mfa.factors.find((f) => f.status === "verified");
                    if (factor) void handleDisableMfa(factor.id);
                  }}
                >
                  Disable
                </Button>
              </div>
            ) : (
              <Button variant="default" size="sm" onClick={() => setMfaEnrollOpen(true)}>
                Enable
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Session Policy */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
          Session Policy
        </h3>
        <Card className="divide-y divide-border/30">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <Label className="text-sm font-medium">Idle timeout</Label>
                <p className="text-xs text-muted-foreground">
                  You'll be signed out after {IDLE_TIMEOUT_MINUTES} minutes of inactivity.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">{IDLE_TIMEOUT_MINUTES}m</Badge>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <Label className="text-sm font-medium">Maximum session length</Label>
                <p className="text-xs text-muted-foreground">
                  Re-authentication is required every {ABSOLUTE_SESSION_HOURS} hours.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">{ABSOLUTE_SESSION_HOURS}h</Badge>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <Label className="text-sm font-medium">Sensitive-action re-auth</Label>
                <p className="text-xs text-muted-foreground">
                  Some actions require you to confirm your identity if more than {STEP_UP_MAX_AGE_MINUTES} minutes have passed.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">{STEP_UP_MAX_AGE_MINUTES}m</Badge>
          </div>
        </Card>
      </div>

      {/* Sessions */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
          Sessions
        </h3>
        <Card className="divide-y divide-border/30">
          {/* Current Session */}
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <CheckCircle className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <Label className="text-sm font-medium">Current Session</Label>
                <p className="text-xs text-muted-foreground">This device • Active now</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">
              Active
            </Badge>
          </div>

          {/* Sign Out Everywhere */}
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <LogOut className="h-4 w-4 text-destructive shrink-0" />
              <div className="min-w-0">
                <Label className="text-sm font-medium">Sign Out Everywhere</Label>
                <p className="text-xs text-muted-foreground">Log out from all devices</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/5" onClick={() => setLogoutConfirmOpen(true)}>
              Sign Out
            </Button>
          </div>
        </Card>
      </div>

      {/* Password Modal/Sheet */}
      {isMobile ? (
        <Sheet open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Change Password</SheetTitle>
              <SheetDescription>Choose a new password for your account</SheetDescription>
            </SheetHeader>
            <div className="py-6">{PasswordFormContent}</div>
            <SheetFooter className="gap-2">{PasswordFormActions}</SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>Choose a new password for your account</DialogDescription>
            </DialogHeader>
            {PasswordFormContent}
            <DialogFooter>{PasswordFormActions}</DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Logout Confirmation */}
      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out everywhere?</AlertDialogTitle>
            <AlertDialogDescription>
              This will log you out of all devices, including this one. You'll need to sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loggingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutAllSessions}
              disabled={loggingOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loggingOut ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Sign Out All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MFA enrollment */}
      <MFAEnrollDialog
        open={mfaEnrollOpen}
        onOpenChange={setMfaEnrollOpen}
        onEnrolled={() => void mfa.refresh()}
      />

      {/* Step-up auth prompt for sensitive identity actions */}
      <StepUpAuthDialog {...stepUp.dialogProps} />
    </div>
  );
};
