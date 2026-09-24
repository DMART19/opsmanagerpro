/**
 * Sign-in MFA challenge dialog.
 * Shown after password sign-in when the user has a verified TOTP factor
 * but the current session is still aal1.
 */

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  challengeAndVerifyTotp,
  listVerifiedTotpFactors,
} from "@/lib/auth/mfa";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent } from "@/lib/log-security-event";

interface Props {
  open: boolean;
  onVerified: () => void;
  onCancel: () => void;
}

export function MFAChallengeDialog({ open, onVerified, onCancel }: Props) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setCode("");
      setFactorId(null);
      return;
    }
    void listVerifiedTotpFactors().then((factors) => {
      const verified = factors.find((f) => f.status === "verified");
      if (verified) setFactorId(verified.id);
    });
  }, [open]);

  const submit = async () => {
    if (!factorId) return;
    setBusy(true);
    try {
      await challengeAndVerifyTotp(factorId, code);
      onVerified();
    } catch (err) {
      await logSecurityEvent({
        event_type: "mfa_challenge_failed",
        severity: "medium",
      });
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    // Failing the challenge ends the session — the user must sign in again.
    await supabase.auth.signOut();
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? void cancel() : null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Two-factor authentication
          </DialogTitle>
          <DialogDescription>
            Enter the 6-digit code from your authenticator app to finish
            signing in.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          <Label htmlFor="mfa-challenge-code">Authentication code</Label>
          <Input
            id="mfa-challenge-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            autoFocus
          />
          <p className="text-[11px] text-muted-foreground">
            Lost access to your device? Contact a workspace owner to reset
            MFA — recovery codes are not stored in the app for security.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={cancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={busy || code.length < 6}
          >
            {busy ? "Verifying…" : "Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}