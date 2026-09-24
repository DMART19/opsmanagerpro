/**
 * Step-up authentication dialog.
 * Driven by `useStepUp()`; spread `dialogProps` onto this component.
 */

import { useEffect, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
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
import { describeStepUp, type StepUpDescriptor } from "@/lib/auth/step-up";
import type { SensitiveAction } from "@/config/security";

interface Props {
  open: boolean;
  action?: SensitiveAction;
  email: string;
  onSubmit: (params: { password?: string; totpCode?: string }) => Promise<void>;
  onCancel: () => void;
}

export function StepUpAuthDialog({
  open,
  action,
  email,
  onSubmit,
  onCancel,
}: Props) {
  const [descriptor, setDescriptor] = useState<StepUpDescriptor | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setCode("");
      setDescriptor(null);
      return;
    }
    void describeStepUp().then(setDescriptor);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        password: descriptor?.method === "password" ? password : undefined,
        totpCode: descriptor?.method === "totp" ? code : undefined,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Verification failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !submitting) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Confirm it's you
          </DialogTitle>
          <DialogDescription>
            This action is sensitive. Please re-verify your identity to
            continue
            {action ? <span className="font-mono"> ({action})</span> : null}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            Signed in as {email || "current user"}
          </div>

          {descriptor?.method === "totp" ? (
            <div className="space-y-2">
              <Label htmlFor="step-up-code">Authentication code</Label>
              <Input
                id="step-up-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="step-up-password">Password</Label>
              <Input
                id="step-up-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Verifying…" : "Verify"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}