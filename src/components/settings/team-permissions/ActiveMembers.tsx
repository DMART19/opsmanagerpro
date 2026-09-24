import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Loader2, Check, Crown, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  WORKSPACE_ROLE_LABELS,
  type WorkspaceRole,
} from "@/lib/workspace-permissions";
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

const ROLE_OPTIONS: WorkspaceRole[] = [
  "viewer",
  "inventory_clerk",
  "safety_manager",
  "supervisor",
  "workspace_admin",
];

const roleBadgeClass: Record<WorkspaceRole, string> = {
  viewer: "bg-muted text-muted-foreground border-border",
  inventory_clerk: "bg-primary/10 text-primary border-primary/20",
  safety_manager: "bg-accent/10 text-accent-foreground border-accent/20",
  supervisor: "bg-secondary text-secondary-foreground border-secondary/20",
  workspace_admin: "bg-destructive/10 text-destructive border-destructive/20",
};

export interface MemberRow {
  id: string;
  user_id: string;
  role: WorkspaceRole;
  status: string;
  profile: {
    display_name: string | null;
    email: string | null;
  } | null;
  pendingRole?: WorkspaceRole;
}

interface ActiveMembersProps {
  members: MemberRow[];
  setMembers: React.Dispatch<React.SetStateAction<MemberRow[]>>;
  loading: boolean;
  canAssign: boolean;
}

export const ActiveMembers = ({ members, setMembers, loading, canAssign }: ActiveMembersProps) => {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<MemberRow | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const adminCount = members.filter((m) => m.role === "workspace_admin").length;
  const isLastAdmin = (m: MemberRow) => m.role === "workspace_admin" && adminCount <= 1;

  const handleRoleChange = (memberId: string, newRole: WorkspaceRole) => {
    const member = members.find((m) => m.id === memberId);
    if (member && isLastAdmin(member) && newRole !== "workspace_admin") {
      toast({
        title: "Cannot change role",
        description: "A workspace must have at least one administrator.",
        variant: "destructive",
      });
      return;
    }
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, pendingRole: newRole } : m))
    );
  };

  const saveRole = async (member: MemberRow) => {
    if (!member.pendingRole || member.pendingRole === member.role) return;
    if (isLastAdmin(member) && member.pendingRole !== "workspace_admin") {
      toast({ title: "Cannot change role", description: "A workspace must have at least one administrator.", variant: "destructive" });
      return;
    }
    setSavingId(member.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("workspace_members")
        .update({ role: member.pendingRole })
        .eq("id", member.id);
      if (error) throw error;

      if (user) {
        await supabase.from("permission_audit_logs").insert({
          workspace_owner_id: user.id,
          changed_by: user.id,
          target_user_id: member.user_id,
          target_member_id: member.id,
          previous_role: member.role,
          new_role: member.pendingRole,
        });
      }

      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, role: member.pendingRole!, pendingRole: undefined } : m
        )
      );
      toast({
        title: "Role updated",
        description: `${member.profile?.display_name || "User"} is now ${WORKSPACE_ROLE_LABELS[member.pendingRole!]}`,
      });
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const removeMember = async () => {
    if (!removingMember) return;
    if (isLastAdmin(removingMember)) {
      toast({ title: "Cannot remove", description: "A workspace must have at least one administrator.", variant: "destructive" });
      setRemovingMember(null);
      return;
    }
    setRemoveLoading(true);
    try {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", removingMember.id);
      if (error) throw error;
      setMembers((prev) => prev.filter((m) => m.id !== removingMember.id));
      toast({ title: "Member removed" });
    } catch {
      toast({ title: "Failed to remove member", variant: "destructive" });
    } finally {
      setRemoveLoading(false);
      setRemovingMember(null);
    }
  };

  const hasPending = (m: MemberRow) => m.pendingRole && m.pendingRole !== m.role;

  return (
    <>
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Active Members</h3>
          <Badge variant="secondary" className="ml-auto text-xs">{members.length}</Badge>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                    Loading members…
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Invite your team members so they can access your workspace.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {member.profile?.display_name || "Unknown User"}
                        {member.role === "workspace_admin" && (
                          <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">
                      {member.profile?.email || "—"}
                    </TableCell>
                    <TableCell>
                      {canAssign ? (
                        <Select
                          value={member.pendingRole || member.role}
                          onValueChange={(v) => handleRoleChange(member.id, v as WorkspaceRole)}
                        >
                          <SelectTrigger className="w-[150px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((r) => (
                              <SelectItem key={r} value={r}>{WORKSPACE_ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={roleBadgeClass[member.role]}>
                          {WORKSPACE_ROLE_LABELS[member.role]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant="outline"
                        className={
                          member.status === "active"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-muted text-muted-foreground border-border"
                        }
                      >
                        {member.status === "active" ? "Active" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canAssign && hasPending(member) && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs gap-1"
                            disabled={savingId === member.id}
                            onClick={() => saveRole(member)}
                          >
                            {savingId === member.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Save
                          </Button>
                        )}
                        {canAssign && !isLastAdmin(member) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setRemovingMember(member)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AlertDialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{removingMember?.profile?.display_name || removingMember?.profile?.email || "this member"}</strong>{" "}
              from the workspace? They will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeMember}
              disabled={removeLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
