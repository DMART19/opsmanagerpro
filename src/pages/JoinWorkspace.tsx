import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, XCircle, Users, KeyRound, Mail } from "lucide-react";
import { WORKSPACE_ROLE_LABELS, type WorkspaceRole } from "@/lib/workspace-permissions";
import { toast } from "sonner";

interface InviteInfo {
  invite_id: string;
  workspace_owner_id: string;
  email: string;
  role: string;
  workspace_name: string;
}

type PageStatus =
  | "loading"
  | "code_entry"
  | "invite_found"
  | "existing_user"
  | "submitting"
  | "success"
  | "error"
  | "invalid";

const INVITE_TOKEN_KEY = "pending_invite_token";

/** Store invite token so it survives the auth redirect */
export function storePendingInvite(token: string) {
  sessionStorage.setItem(INVITE_TOKEN_KEY, token);
}

/** Consume (read + delete) a pending invite token */
export function consumePendingInvite(): string | null {
  const token = sessionStorage.getItem(INVITE_TOKEN_KEY);
  if (token) sessionStorage.removeItem(INVITE_TOKEN_KEY);
  return token;
}

const JoinWorkspace = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get("token");

  const [status, setStatus] = useState<PageStatus>(tokenFromUrl ? "loading" : "code_entry");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [resolvedToken, setResolvedToken] = useState<string | null>(tokenFromUrl);

  // Code entry
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);

  const acceptInvite = useCallback(async (token: string, userId: string) => {
    try {
      const { data: acceptResult, error } = await supabase.rpc("accept_workspace_invite", {
        p_token: token,
        p_user_id: userId,
      });
      if (error) throw error;
      if (acceptResult === "invalid") throw new Error("This invite is no longer valid.");
      if (acceptResult === "email_mismatch") throw new Error("Your account email doesn't match this invitation.");
      return true;
    } catch (err: any) {
      console.error("Accept invite error:", err);
      return false;
    }
  }, []);

  const lookupInvite = async (tokenOrCode: string) => {
    setStatus("loading");
    try {
      const { data, error } = await supabase.rpc("lookup_workspace_invite", {
        p_token: tokenOrCode,
      });

      if (error || !data?.length) {
        setStatus("invalid");
        setErrorMsg("This invite link is invalid, expired, or has already been used.");
        return;
      }

      const inv = data[0] as InviteInfo;
      setInvite(inv);
      setResolvedToken(tokenOrCode);

      // Check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (!inv.email || user.email?.toLowerCase() === inv.email.toLowerCase()) {
          setStatus("existing_user");
        } else {
          // Wrong account — sign out and show sign-in redirect
          await supabase.auth.signOut();
          setStatus("invite_found");
        }
      } else {
        setStatus("invite_found");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  useEffect(() => {
    if (tokenFromUrl) {
      lookupInvite(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleSignInRedirect = () => {
    if (!invite || !resolvedToken) return;
    // Store invite token for after login
    storePendingInvite(resolvedToken);
    // Redirect to auth page for sign in/sign up
    navigate(`/auth?mode=signup`);
  };

  const handleExistingAccept = async () => {
    if (!invite || !resolvedToken) return;
    setStatus("submitting");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ok = await acceptInvite(resolvedToken, user.id);
      if (!ok) {
        setErrorMsg("Failed to accept invitation.");
        setStatus("error");
        return;
      }

      setStatus("success");
      toast.success("You have successfully joined the workspace.");
      setTimeout(() => navigate("/dashboard"), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to accept invitation.");
      setStatus("error");
    }
  };

  // Code entry helpers
  const handleCodeSubmit = () => {
    const code = codeDigits.join("").toUpperCase();
    if (code.length !== 6) {
      toast.error("Please enter the full 6-character code.");
      return;
    }
    lookupInvite(code);
  };

  const handleCodeInput = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const alphanumeric = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const newDigits = [...codeDigits];
    newDigits[index] = alphanumeric;
    setCodeDigits(newDigits);
    if (alphanumeric && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
    }
    if (e.key === "Enter") handleCodeSubmit();
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
    const newDigits = [...codeDigits];
    for (let i = 0; i < 6; i++) newDigits[i] = pasted[i] || "";
    setCodeDigits(newDigits);
    if (pasted.length === 6) setTimeout(() => lookupInvite(pasted), 100);
  };

  const roleLabel = WORKSPACE_ROLE_LABELS[invite?.role as WorkspaceRole] || invite?.role || "";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 sm:p-8 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Join Workspace</h1>
            <p className="text-xs text-muted-foreground">Use a link or invite code to join a team</p>
          </div>
        </div>

        {/* Loading */}
        {status === "loading" && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Code Entry */}
        {status === "code_entry" && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <KeyRound className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Enter Invite Code</p>
              <p className="text-xs text-muted-foreground">
                Enter the 6-character code shared by your team admin
              </p>
            </div>
            <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
              {codeDigits.map((digit, i) => (
                <Input
                  key={i}
                  id={`code-${i}`}
                  value={digit}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className="w-11 h-12 text-center text-lg font-mono font-bold uppercase"
                  maxLength={1}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <Button onClick={handleCodeSubmit} className="w-full">Join Workspace</Button>
            <p className="text-xs text-center text-muted-foreground">
              Already have an account?{" "}
              <button type="button" className="text-primary hover:underline" onClick={() => navigate("/auth")}>
                Sign in
              </button>
            </p>
          </div>
        )}

        {/* Invite found — sign in/sign up flow */}
        {status === "invite_found" && invite && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-1.5">
              <p className="text-sm text-foreground">
                You've been invited to join <span className="font-semibold">{invite.workspace_name}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Role: <span className="font-medium text-primary">{roleLabel}</span>
              </p>
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Sign in or create an account with <span className="font-medium text-foreground">{invite.email}</span> to join.
              </p>
            </div>
            <Button onClick={handleSignInRedirect} className="w-full">
              <Mail className="mr-2 h-4 w-4" />
              Continue to Sign In
            </Button>
          </div>
        )}


        {/* Existing user flow */}
        {status === "existing_user" && invite && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-1.5">
              <p className="text-sm text-foreground">
                You've been invited to join <span className="font-semibold">{invite.workspace_name}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Role: <span className="font-medium text-primary">{roleLabel}</span>
              </p>
            </div>
            <Button className="w-full" onClick={handleExistingAccept}>Accept Invitation</Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate("/dashboard")}>Decline</Button>
          </div>
        )}

        {/* Invalid / Error */}
        {(status === "invalid" || status === "error") && (
          <div className="text-center py-6 space-y-3">
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => {
                setStatus("code_entry");
                setCodeDigits(["", "", "", "", "", ""]);
                setErrorMsg("");
              }}>
                Try Another Code
              </Button>
              <Button variant="ghost" onClick={() => navigate("/")}>Go to Homepage</Button>
            </div>
          </div>
        )}

        {/* Submitting */}
        {status === "submitting" && (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Joining workspace…</span>
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
            <p className="text-sm font-medium text-foreground">You have successfully joined the workspace.</p>
            <p className="text-xs text-muted-foreground">Redirecting to dashboard…</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default JoinWorkspace;
