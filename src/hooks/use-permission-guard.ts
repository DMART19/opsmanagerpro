/**
 * usePermissionGuard - Returns a guard function that blocks unauthorized actions.
 * 
 * Usage:
 *   const { guardAction } = usePermissionGuard();
 *   const handleAssignCredential = guardAction("manage_credentials", () => setOpen(true), 
 *     "Credential management requires Safety Manager or higher.");
 */

import { useState, useCallback } from "react";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import type { WorkspacePermission } from "@/lib/workspace-permissions";
import { toast } from "@/hooks/use-toast";

interface PermissionGuardResult {
  /** Wrap an action with a permission check. Returns a no-op function if denied. */
  guardAction: (
    permission: WorkspacePermission,
    action: () => void,
    deniedMessage?: string
  ) => () => void;
  /** Check a permission directly */
  hasPermission: (permission: WorkspacePermission) => boolean;
}

export const usePermissionGuard = (): PermissionGuardResult => {
  const { hasPermission } = useWorkspacePermissions();

  const guardAction = useCallback(
    (permission: WorkspacePermission, action: () => void, deniedMessage?: string) => {
      return () => {
        if (hasPermission(permission)) {
          action();
        } else {
          toast({
            title: "Permission denied",
            description: deniedMessage || "You do not have permission to perform this action.",
            variant: "destructive",
          });
        }
      };
    },
    [hasPermission]
  );

  return { guardAction, hasPermission };
};
