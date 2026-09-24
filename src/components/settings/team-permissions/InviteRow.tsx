import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Link2, Copy, Check, UserPlus, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAppOrigin } from "@/config/app-url";
import { toast } from "@/hooks/use-toast";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WORKSPACE_ROLE_LABELS,
  type WorkspaceRole,
} from "@/lib/workspace-permissions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import QRCode from "qrcode";
import { useEffect, useRef } from "react";

const INVITE_ROLES: WorkspaceRole[] = [
  "viewer",
  "inventory_clerk",
  "safety_manager",
  "supervisor",
];

interface InviteRowProps {
  onInviteSent: () => void;
}

const QRDialog = ({ link, open, onOpenChange }: { link: string; open: boolean; onOpenChange: (o: boolean) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open && canvasRef.current && link) {
      QRCode.toCanvas(canvasRef.current, link, { width: 220, margin: 2 });
    }
  }, [open, link]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-sm">Scan to Join</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          <canvas ref={canvasRef} />
          <p className="text-xs text-muted-foreground text-center">
            Scan this QR code to open the invite link
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const InviteRow = ({ onInviteSent }: InviteRowProps) => {
  const [role, setRole] = useState<WorkspaceRole>("viewer");
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const generateShortCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedLink(null);
    setShortCode(null);
    try {
      enforceRateLimit("invite");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const token = crypto.randomUUID();
      const code = generateShortCode();

      const { error } = await supabase.from("workspace_invites").insert({
        workspace_owner_id: user.id,
        email: "",
        role,
        invite_token: token,
        short_code: code,
        status: "pending",
      });

      if (error) throw error;

      const link = `${getAppOrigin()}/accept-invite?token=${token}`;
      setGeneratedLink(link);
      setShortCode(code);
      onInviteSent();
    } catch (error: any) {
      console.error("Error generating invite:", error);
      toast({
        title: "Failed to generate invite link",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast({ title: "Invite link copied", description: "Share it with your team member." });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    if (!shortCode) return;
    navigator.clipboard.writeText(shortCode);
    setCopiedCode(true);
    toast({ title: "Invite code copied" });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Generate Access Link</h3>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Select a role and generate a shareable link or invite code. No email required.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={role} onValueChange={(v) => setRole(v as WorkspaceRole)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INVITE_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {WORKSPACE_ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleGenerate} disabled={generating} className="gap-1.5">
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          Generate Access Link
        </Button>
      </div>

      {generatedLink && (
        <div className="mt-4 space-y-3">
          {/* Link */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Invite Link</p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={generatedLink}
                className="flex-1 text-xs font-mono bg-muted/50"
                onFocus={(e) => e.target.select()}
              />
              <Button size="sm" variant="outline" onClick={copyLink} className="gap-1.5 shrink-0">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowQR(true)} className="shrink-0">
                <QrCode className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Short code */}
          {shortCode && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Invite Code</p>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {shortCode.split("").map((c, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center justify-center w-8 h-9 rounded-md border border-border bg-muted/50 text-sm font-mono font-bold text-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <Button size="sm" variant="ghost" onClick={copyCode} className="gap-1 text-xs h-7">
                  {copiedCode ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedCode ? "Copied" : "Copy Code"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Teammates can enter this code on the login page to join.
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            ⏱ This link expires in 7 days and can only be used once.
          </p>
        </div>
      )}

      {generatedLink && <QRDialog link={generatedLink} open={showQR} onOpenChange={setShowQR} />}
    </Card>
  );
};
