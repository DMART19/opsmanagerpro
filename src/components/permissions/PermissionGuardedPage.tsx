/**
 * PermissionGuardedPage - Blocks access to a page if user lacks the required permission.
 * Shows an informative message instead of the page content.
 */

import { ReactNode } from "react";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import type { WorkspacePermission } from "@/lib/workspace-permissions";
import { useTourMode } from "@/contexts/TourModeContext";
import { Navigation } from "@/components/Navigation";
import { LegalFooter } from "@/components/LegalFooter";
import { PageTransitionWrapper } from "@/components/PageTransitionWrapper";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { WORKSPACE_ROLE_LABELS } from "@/lib/workspace-permissions";

interface PermissionGuardedPageProps {
  permission: WorkspacePermission;
  /** Human-readable module name for the denial message */
  moduleName: string;
  /** Comma-separated role names that have access */
  requiredRoles?: string;
  children: ReactNode;
}

export const PermissionGuardedPage = ({
  permission,
  moduleName,
  requiredRoles,
  children,
}: PermissionGuardedPageProps) => {
  const { hasPermission, loading, roleLabel } = useWorkspacePermissions();
  const { isTourMode } = useTourMode();
  const navigate = useNavigate();

  // In tour mode there's no real workspace/role to fetch; render immediately so
  // the underlying page (and its data-tour anchors) mount for the walkthrough.
  if (loading && !isTourMode) {
    // Lightweight loader — works both standalone and embedded inside another
    // layout (e.g. Layout Planner tab) without duplicating Navigation chrome.
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="animate-pulse text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <PageTransitionWrapper>
        <main className="flex-1 max-w-lg mx-auto px-4 py-16 flex items-start justify-center">
          <Card className="p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Access Restricted</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {moduleName} requires {requiredRoles || "a higher role"}.
              <br />
              Your current role is <strong>{roleLabel}</strong>.
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="mt-2">
              Back to Dashboard
            </Button>
          </Card>
        </main>
      </PageTransitionWrapper>
      <LegalFooter />
    </div>
  );
};
