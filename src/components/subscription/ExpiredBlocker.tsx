/**
 * Archived Blocker - Full-screen overlay when workspace is archived
 * Allows viewing data but blocks all modifications
 */

import { Archive, Mail, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useSuperAdmin } from "@/hooks/use-super-admin";
import { useTourMode } from "@/contexts/TourModeContext";

export const ExpiredBlocker = () => {
  const { plan } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSuperAdmin } = useSuperAdmin();
  const { isTourMode } = useTourMode();

  // Allow settings page so admins can restore; never block super admin
  const isSettingsPage = location.pathname.startsWith("/settings");
  if (isTourMode || isSuperAdmin || plan.loading || !plan.isArchived || isSettingsPage) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-2xl border-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Archive className="h-8 w-8 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            This workspace has been archived.
          </h1>
          <p className="text-muted-foreground">
            All modifications are disabled. Admins can still view and export data.
            Go to Settings → Workspace to restore access.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm text-left space-y-2">
          <p className="font-medium">While archived, you cannot:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Create or edit assets</li>
            <li>Create or edit tasks</li>
            <li>Modify team records</li>
            <li>Change settings</li>
          </ul>
        </div>

        <div className="space-y-3 pt-2">
          <Button className="w-full" size="lg" onClick={() => navigate("/settings")}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Go to Settings
          </Button>
          
          <Button variant="outline" className="w-full" asChild>
            <a href="mailto:support@opsmanagerpro.com">
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </a>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          You can view and export your data for at least 30 days from the subscription end date.
          After that, workspace data may be scheduled for permanent deletion (normally within 90 days).
        </p>

      </Card>
    </div>
  );
};
