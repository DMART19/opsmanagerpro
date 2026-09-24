/**
 * PermissionGate - Conditionally renders children based on workspace permissions.
 * 
 * Usage:
 *   <PermissionGate permission="create_assets">
 *     <Button>Add Asset</Button>
 *   </PermissionGate>
 * 
 * When denied, shows a disabled fallback or nothing.
 */

import { ReactNode } from "react";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import type { WorkspacePermission } from "@/lib/workspace-permissions";
import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface PermissionGateProps {
  /** Required permission to show children */
  permission: WorkspacePermission;
  children: ReactNode;
  /** What to show when denied. Defaults to nothing. Use "disabled" for a greyed-out lock indicator. */
  fallback?: "hidden" | "disabled" | ReactNode;
  /** Custom denial message for tooltip */
  deniedMessage?: string;
}

export const PermissionGate = ({ permission, children, fallback = "hidden", deniedMessage }: PermissionGateProps) => {
  const { hasPermission, loading } = useWorkspacePermissions();

  // While loading, render children to avoid flash
  if (loading) return <>{children}</>;

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  if (fallback === "hidden") return null;

  if (fallback === "disabled") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1.5 opacity-40 cursor-not-allowed pointer-events-none select-none">
            {children}
            <Lock className="h-3 w-3 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{deniedMessage || "You do not have permission to perform this action."}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return <>{fallback}</>;
};

/**
 * PermissionMessage - Shows a denial message inline
 */
export const PermissionDeniedMessage = ({ message }: { message?: string }) => (
  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
    <Lock className="h-4 w-4 shrink-0" />
    <span>{message || "You do not have permission to perform this action."}</span>
  </div>
);

