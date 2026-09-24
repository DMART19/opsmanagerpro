/**
 * Hook to get the current user's workspace role.
 * 
 * Logic:
 * - Super admins bypass everything (always workspace_admin)
 * - Workspace owners are always workspace_admin
 * - Workspace members get their assigned role
 * - Users not part of any workspace default to workspace_admin (their own workspace)
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/use-super-admin";
import type { WorkspaceRole } from "@/lib/workspace-permissions";

interface WorkspaceRoleState {
  role: WorkspaceRole;
  loading: boolean;
  /** The workspace owner's user ID (for members viewing someone else's workspace) */
  workspaceOwnerId: string | null;
  /** Whether the current user IS the workspace owner */
  isOwner: boolean;
  /** Refresh the role (e.g. after accepting an invite) */
  refresh: () => void;
}

export const useWorkspaceRole = (): WorkspaceRoleState => {
  const [role, setRole] = useState<WorkspaceRole>("workspace_admin");
  const [loading, setLoading] = useState(true);
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(true);
  const { isSuperAdmin } = useSuperAdmin();

  const fetchRole = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRole("workspace_admin");
        setIsOwner(true);
        setLoading(false);
        return;
      }

      // Super admin always gets full access
      if (isSuperAdmin) {
        setRole("workspace_admin");
        setWorkspaceOwnerId(user.id);
        setIsOwner(true);
        setLoading(false);
        return;
      }

      // Check if user is a member of someone else's workspace
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("role, workspace_owner_id, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (membership) {
        // User is a member of another workspace
        setRole(membership.role as WorkspaceRole);
        setWorkspaceOwnerId(membership.workspace_owner_id);
        setIsOwner(false);
      } else {
        // User is viewing their own workspace — they are workspace_admin
        setRole("workspace_admin");
        setWorkspaceOwnerId(user.id);
        setIsOwner(true);
      }
    } catch (error) {
      console.error("Error fetching workspace role:", error);
      // Default to owner with full access on error
      setRole("workspace_admin");
      setIsOwner(true);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  return { role, loading, workspaceOwnerId, isOwner, refresh: fetchRole };
};
