import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import { type WorkspaceRole } from "@/lib/workspace-permissions";
import { InviteRow } from "./team-permissions/InviteRow";
import { ActiveMembers, type MemberRow } from "./team-permissions/ActiveMembers";
import { PendingInvites, type InviteRow as InviteRowType } from "./team-permissions/PendingInvites";
import { RoleGuide } from "./team-permissions/RoleGuide";

export const TeamPermissionsTab = () => {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState<InviteRowType[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const { hasPermission } = useWorkspacePermissions();
  const canAssign = hasPermission("assign_roles");

  useEffect(() => {
    loadMembers();
    loadInvites();
  }, []);

  const loadMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, status")
        .eq("workspace_owner_id", user.id);

      if (error) throw error;

      const userIds = data?.map((m) => m.user_id) || [];
      let profiles: { id: string; display_name: string | null; email: string | null }[] = [];

      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", userIds);
        profiles = profileData || [];
      }

      const merged: MemberRow[] =
        data?.map((m) => ({
          id: m.id,
          user_id: m.user_id,
          role: m.role as WorkspaceRole,
          status: m.status,
          profile: profiles.find((p) => p.id === m.user_id) || null,
        })) || [];

      setMembers(merged);
    } catch (error) {
      console.error("Error loading workspace members:", error);
      toast({
        title: "Error loading team members",
        description: "Failed to fetch workspace member data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInvites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("workspace_invites")
        .select("id, email, role, status, invite_token, short_code, expires_at")
        .eq("workspace_owner_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInvites((data as unknown as InviteRowType[]) || []);
    } catch (error) {
      console.error("Error loading invites:", error);
    } finally {
      setInvitesLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!canAssign && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            You do not have permission to manage team roles.
          </AlertDescription>
        </Alert>
      )}

      {canAssign && <InviteRow onInviteSent={loadInvites} />}

      <ActiveMembers
        members={members}
        setMembers={setMembers}
        loading={loading}
        canAssign={canAssign}
      />

      {canAssign && (
        <PendingInvites
          invites={invites}
          setInvites={setInvites}
          loading={invitesLoading}
        />
      )}

      <RoleGuide />
    </div>
  );
};
