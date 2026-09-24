/**
 * Workspace Context Hook
 * 
 * Resolves the effective workspace ID for data queries.
 * - Workspace owners: their own user_id
 * - Workspace members: the workspace_owner_id they belong to
 * - Super admins: null (can see all workspaces)
 * 
 * All data queries should use this to ensure workspace isolation.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/use-super-admin";


interface WorkspaceContext {
  /** The effective workspace ID (owner's user_id) for scoping queries */
  workspaceId: string | null;
  /** Whether the context is still loading */
  loading: boolean;
  /** Whether the current user is a super admin (bypasses isolation) */
  isSuperAdmin: boolean;
  /** Whether workspace isolation is enforced for this user */
  isIsolated: boolean;
  /** Refresh the workspace context */
  refresh: () => void;
  /** Validate that a given user_id belongs to this workspace */
  belongsToWorkspace: (dataOwnerId: string | null) => boolean;
}

export const useWorkspaceContext = (): WorkspaceContext => {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin, loading: adminLoading } = useSuperAdmin();

  const fetchWorkspaceId = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setWorkspaceId(null);
        setLoading(false);
        return;
      }

      // Super admins bypass isolation
      if (isSuperAdmin) {
        setWorkspaceId(null);
        setLoading(false);
        return;
      }

      // Check if user is a member of another workspace
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_owner_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .neq("workspace_owner_id", user.id)
        .maybeSingle();

      if (membership?.workspace_owner_id) {
        setWorkspaceId(membership.workspace_owner_id);
      } else {
        // User is the workspace owner
        setWorkspaceId(user.id);
      }
    } catch (error) {
      console.error("Error resolving workspace context:", error);
      // Default to null — RLS will handle protection
      setWorkspaceId(null);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!adminLoading) {
      fetchWorkspaceId();
    }
  }, [fetchWorkspaceId, adminLoading]);

  const isIsolated = !isSuperAdmin;

  const belongsToWorkspace = useCallback(
    (dataOwnerId: string | null): boolean => {
      if (!isIsolated) return true; // Super admins see all
      if (!workspaceId || !dataOwnerId) return false;
      return dataOwnerId === workspaceId;
    },
    [workspaceId, isIsolated]
  );

  return useMemo(() => ({
    workspaceId,
    loading: loading || adminLoading,
    isSuperAdmin,
    isIsolated,
    refresh: fetchWorkspaceId,
    belongsToWorkspace,
  }), [workspaceId, loading, adminLoading, isSuperAdmin, isIsolated, fetchWorkspaceId, belongsToWorkspace]);
};
