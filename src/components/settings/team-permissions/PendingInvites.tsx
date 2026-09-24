import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link2, Loader2, Copy, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAppOrigin } from "@/config/app-url";
import { toast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  WORKSPACE_ROLE_LABELS,
  type WorkspaceRole,
} from "@/lib/workspace-permissions";
import { format, isPast, formatDistanceToNowStrict } from "date-fns";

const roleBadgeClass: Record<WorkspaceRole, string> = {
  viewer: "bg-muted text-muted-foreground border-border",
  inventory_clerk: "bg-primary/10 text-primary border-primary/20",
  safety_manager: "bg-accent/10 text-accent-foreground border-accent/20",
  supervisor: "bg-secondary text-secondary-foreground border-secondary/20",
  workspace_admin: "bg-destructive/10 text-destructive border-destructive/20",
};

export interface InviteRow {
  id: string;
  email: string;
  role: string;
  status: string;
  invite_token: string;
  short_code?: string | null;
  expires_at?: string | null;
  invited_by_name?: string;
}

interface PendingInvitesProps {
  invites: InviteRow[];
  setInvites: React.Dispatch<React.SetStateAction<InviteRow[]>>;
  loading: boolean;
}

const maskToken = (token: string) => {
  if (token.length <= 8) return token;
  return token.slice(0, 4) + "••••" + token.slice(-4);
};

const getStatusInfo = (invite: InviteRow): { label: string; variant: "default" | "outline" | "destructive" | "secondary" | "warning" } => {
  if (invite.status === "revoked") return { label: "Revoked", variant: "destructive" };
  if (invite.status === "accepted") return { label: "Redeemed", variant: "secondary" };
  if (invite.expires_at && isPast(new Date(invite.expires_at))) return { label: "Expired", variant: "warning" };
  return { label: "Active", variant: "default" };
};

export const PendingInvites = ({ invites, setInvites, loading }: PendingInvitesProps) => {
  const [actionId, setActionId] = useState<string | null>(null);

  const copyInviteLink = (token: string) => {
    const url = `${getAppOrigin()}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Invite link copied", description: "Share it with your team." });
  };

  const revokeInvite = async (inviteId: string) => {
    setActionId(inviteId);
    try {
      const { error } = await supabase
        .from("workspace_invites")
        .update({ status: "revoked", revoked_at: new Date().toISOString() } as any)
        .eq("id", inviteId);
      if (error) throw error;
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      toast({ title: "Invite revoked" });
    } catch {
      toast({ title: "Failed to revoke invite", variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  if (invites.length === 0 && !loading) return null;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Invite Links</h3>
        {invites.length > 0 && (
          <Badge variant="warning" className="ml-auto text-xs">{invites.length}</Badge>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead className="hidden sm:table-cell">Link / Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                  Loading invites…
                </TableCell>
              </TableRow>
            ) : (
              invites.map((invite) => {
                const statusInfo = getStatusInfo(invite);
                const isActive = statusInfo.label === "Active";

                return (
                  <TableRow key={invite.id}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={roleBadgeClass[invite.role as WorkspaceRole] || "bg-muted text-muted-foreground border-border"}
                      >
                        {WORKSPACE_ROLE_LABELS[invite.role as WorkspaceRole] || invite.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-mono text-muted-foreground">
                          {maskToken(invite.invite_token)}
                        </span>
                        {invite.short_code && (
                          <span className="text-xs font-mono font-semibold text-foreground">
                            Code: {invite.short_code}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant} className="text-xs">
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {invite.expires_at ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {isPast(new Date(invite.expires_at))
                            ? "Expired"
                            : formatDistanceToNowStrict(new Date(invite.expires_at), { addSuffix: true })
                          }
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No expiry</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isActive && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs gap-1"
                              onClick={() => copyInviteLink(invite.invite_token)}
                            >
                              <Copy className="h-3 w-3" />
                              <span className="hidden sm:inline">Copy</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                              disabled={actionId === invite.id}
                              onClick={() => revokeInvite(invite.id)}
                            >
                              {actionId === invite.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              <span className="hidden sm:inline">Revoke</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
