/**
 * MFA enrollment dialog (TOTP).
 * Walks the user through scan → verify → confirm.
 * The TOTP secret is only ever held in component state and is dropped
 * on close. We never log or persist it.
 */

import { useEffect, useState } from "react";
import { Copy, ShieldCheck } from "lucide-react";
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
  completeTotpEnrollment,
  startTotpEnrollment,
  type EnrollResult,
} from "@/lib/auth/mfa";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrolled: () => void;
}

export function MFAEnrollDialog({ open, onOpenChange, onEnrolled }: Props) {
  const [enrollment, setEnrollment] = useState<EnrollResult | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      // Drop secret from memory when dialog closes.
      setEnrollment(null);
      setCode("");
      return;
    }
    setBusy(true);
    startTotpEnrollment()
      .then(setEnrollment)
      .catch((err) => {
        toast.error(err?.message ?? "Couldn't start MFA enrollment");
        onOpenChange(false);
      })
      .finally(() => setBusy(false));
  }, [open, onOpenChange]);

  const handleVerify = async () => {
    if (!enrollment) return;
    setBusy(true);
    try {
      await completeTotpEnrollment(enrollment.factorId, code);
      toast.success("MFA enabled. You're protected.");
      onEnrolled();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Enable two-factor authentication
          </DialogTitle>
          <DialogDescription>
            Scan the QR code with an authenticator app (1Password, Authy, Google
            Authenticator) then enter the 6-digit code to confirm.
          </DialogDescription>
        </DialogHeader>

        {enrollment ? (
          <div className="space-y-4">
            <div
              className="flex items-center justify-center rounded-lg border bg-card p-4"
              dangerouslySetInnerHTML={{ __html: enrollment.qrCodeSvg }}
            />
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Or enter this setup key manually
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">
                  {enrollment.secret}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    void navigator.clipboard.writeText(enrollment.secret);
                    toast.success("Setup key copied");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                This key is shown once. Keep your authenticator app secure — if
                you lose access, contact a workspace owner to reset MFA.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mfa-code">6-digit code</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
              />
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Preparing secure enrollment…
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleVerify}
            disabled={busy || !enrollment || code.length < 6}
          >
            {busy ? "Verifying…" : "Enable MFA"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}