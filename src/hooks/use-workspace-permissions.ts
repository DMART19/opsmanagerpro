/**
 * Hook for checking workspace-level permissions.
 * 
 * Uses the permission matrix to determine what actions the current user can perform.
 * Super admins and workspace owners bypass all checks.
 */

import { useCallback, useMemo } from "react";
import { useWorkspaceRole } from "@/hooks/use-workspace-role";
import { useSuperAdmin } from "@/hooks/use-super-admin";
import { useTourMode } from "@/contexts/TourModeContext";
import {
  roleHasPermission,
  roleCanSeeModule,
  type WorkspacePermission,
  type NavModule,
  type WorkspaceRole,
  WORKSPACE_ROLE_LABELS,
} from "@/lib/workspace-permissions";

interface WorkspacePermissionsResult {
  /** Check if the current user has a specific permission */
  hasPermission: (permission: WorkspacePermission) => boolean;
  /** Check if a nav module should be visible */
  canSeeModule: (module: NavModule) => boolean;
  /** Current workspace role */
  role: WorkspaceRole;
  /** Human-readable role label */
  roleLabel: string;
  /** Whether permissions are still loading */
  loading: boolean;
  /** Whether the user is the workspace owner */
  isOwner: boolean;
  /** Refresh workspace role */
  refreshRole: () => void;
}

export const useWorkspacePermissions = (): WorkspacePermissionsResult => {
  const { role, loading: roleLoading, isOwner, refresh } = useWorkspaceRole();
  const { isSuperAdmin, loading: adminLoading } = useSuperAdmin();
  const { isTourMode } = useTourMode();

  const loading = roleLoading || adminLoading;

  const hasPermission = useCallback(
    (permission: WorkspacePermission): boolean => {
      // Demo mode and super admins have full access
      if (isTourMode || isSuperAdmin) return true;
      return roleHasPermission(role, permission);
    },
    [role, isTourMode, isSuperAdmin]
  );

  const canSeeModule = useCallback(
    (module: NavModule): boolean => {
      if (isTourMode || isSuperAdmin) return true;
      return roleCanSeeModule(role, module);
    },
    [role, isTourMode, isSuperAdmin]
  );

  const roleLabel = useMemo(
    () => WORKSPACE_ROLE_LABELS[role] ?? role,
    [role]
  );

  return {
    hasPermission,
    canSeeModule,
    role,
    roleLabel,
    loading,
    isOwner,
    refreshRole: refresh,
  };
};
