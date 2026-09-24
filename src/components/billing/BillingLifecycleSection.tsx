/**
 * Billing Lifecycle Section - Shows workspace billing status and reactivation options
 */

import { useState } from "react";
import { AlertTriangle, CheckCircle, Archive, CreditCard, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSubscription, type WorkspaceStatus } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";


const STATUS_CONFIG: Record<WorkspaceStatus, {
  label: string;
  description: string;
  variant: "default" | "destructive" | "success" | "warning";
  icon: typeof CheckCircle;
  badgeClass: string;
}> = {
  active: {
    label: "Active",
    description: "Your workspace is fully operational.",
    variant: "success",
    icon: CheckCircle,
    badgeClass: "bg-success/10 text-success border-success/30",
  },
  past_due: {
    label: "Past Due",
    description: "A billing issue was detected. Please update your payment method to avoid service interruption. Automatic retries are in progress.",
    variant: "warning",
    icon: CreditCard,
    badgeClass: "bg-warning/10 text-warning border-warning/30",
  },
  read_only: {
    label: "Read-Only",
    description: "Your subscription has ended. You can still view and export your data, but cannot make changes. Update billing to restore full access.",
    variant: "destructive",
    icon: AlertTriangle,
    badgeClass: "bg-destructive/10 text-destructive border-destructive/30",
  },
  archived: {
    label: "Archived",
    description: "This workspace is archived. Administrators can still view and export data for at least 30 days from the subscription end date. After that, workspace data may be scheduled for permanent deletion (normally within 90 days of the subscription end date). Update billing to restore your workspace.",
    variant: "destructive",
    icon: Archive,
    badgeClass: "bg-destructive/10 text-destructive border-destructive/30",
  },

};

export const BillingLifecycleSection = () => {
  const { plan } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (!data?.url) throw new Error("No portal URL returned");
      window.open(data.url, "_blank");
    } catch (err) {
      console.error("customer-portal error", err);
      toast.error("We couldn't open the billing portal", {
        description: "Please try again in a moment, or contact support if it keeps happening.",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  if (plan.loading) return null;

  const status = plan.workspaceStatus;
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const showReactivate = status !== "active";


  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Workspace Status</h3>
        <Badge variant="outline" className={cn("text-xs", config.badgeClass)}>
          <Icon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
      </div>

      <Alert variant={config.variant}>
        <Icon className="h-4 w-4" />
        <AlertTitle>{config.label}</AlertTitle>
        <AlertDescription>{config.description}</AlertDescription>
      </Alert>

      {status === "past_due" && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-foreground">Payment Retry Schedule</p>
          <div className="grid grid-cols-4 gap-2">
            {[1, 3, 5, 7].map((day) => (
              <div key={day} className="text-center">
                <div className="text-[10px] text-muted-foreground">Day {day}</div>
                <Clock className="h-3 w-3 mx-auto text-muted-foreground mt-0.5" />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            If payment fails after Day 7, workspace enters read-only mode.
          </p>
        </div>
      )}

      {plan.subscriptionEndDate && (
        <p className="text-xs text-muted-foreground">
          Subscription ended: {new Date(plan.subscriptionEndDate).toLocaleDateString()}
        </p>
      )}

      {showReactivate && (
        <Button className="w-full" size="sm" onClick={openCustomerPortal} disabled={portalLoading}>
          {portalLoading ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4 mr-1.5" />
          )}
          Update Payment Method
        </Button>
      )}

    </Card>
  );
};
