/**
 * Subscription Tab - Shows plan status, trial info, and usage
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, AlertTriangle, CheckCircle, Package, Clock, Calendar } from "lucide-react";
import { useSubscription, PLAN_DISPLAY_NAMES } from "@/contexts/SubscriptionContext";
import { useSettings } from "@/contexts/SettingsContext";
import { UsageLimitIndicator } from "@/components/subscription/UsageLimitIndicator";
import { PricingTable } from "@/components/billing/PricingTable";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isPast } from "date-fns";

export const SubscriptionTab = () => {
  const { plan, usageLimits } = useSubscription();
  const { workspaceSettings } = useSettings();

  const trialEndsAt = workspaceSettings.trial_ends_at ? new Date(workspaceSettings.trial_ends_at) : null;
  const trialStartedAt = workspaceSettings.trial_started_at ? new Date(workspaceSettings.trial_started_at) : null;
  const subscriptionStatus = workspaceSettings.subscription_status || "trialing";
  const isTrialing = subscriptionStatus === "trialing";
  const isTrialExpired = trialEndsAt ? isPast(trialEndsAt) : false;
  const daysRemaining = trialEndsAt ? Math.max(0, differenceInDays(trialEndsAt, new Date())) : null;

  const getStatusBadge = () => {
    if (isTrialing && !isTrialExpired) {
      return <Badge className="bg-primary/10 text-primary border border-primary/20">Trial</Badge>;
    }
    if (isTrialExpired) {
      return <Badge variant="destructive">Trial Expired</Badge>;
    }
    switch (plan.status) {
      case "active":
        return <Badge className="bg-success text-success-foreground">Active</Badge>;
      case "over_limit":
        return <Badge variant="destructive">Over Limit</Badge>;
      case "read_only":
        return <Badge variant="outline" className="text-muted-foreground border-destructive">Read-Only</Badge>;
    }
  };

  const planDisplayName = PLAN_DISPLAY_NAMES[plan.plan] || plan.plan;

  return (
    <div className="space-y-6">
      {/* Trial Status Card */}
      {isTrialing && (
        <Card className={cn(
          "p-4 border",
          isTrialExpired 
            ? "bg-destructive/5 border-destructive/20" 
            : daysRemaining !== null && daysRemaining <= 3
              ? "bg-warning/5 border-warning/30"
              : "bg-primary/5 border-primary/20"
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
              isTrialExpired ? "bg-destructive/10" : "bg-primary/10"
            )}>
              <Clock className={cn(
                "h-5 w-5",
                isTrialExpired ? "text-destructive" : "text-primary"
              )} />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium text-foreground">
                    {isTrialExpired ? "Trial Expired" : "Free Trial"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isTrialExpired 
                      ? "Upgrade to restore full access" 
                      : "14-day trial · No credit card required"}
                  </p>
                </div>
                {!isTrialExpired && daysRemaining !== null && (
                  <Badge variant="outline" className={cn(
                    "tabular-nums",
                    daysRemaining <= 3 ? "border-warning text-warning" : "border-primary/40 text-primary"
                  )}>
                    {daysRemaining === 0 ? "Expires today" : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`}
                  </Badge>
                )}
              </div>
              
              <div className="bg-background/60 rounded-lg p-3 space-y-1.5">
                {trialStartedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Started
                    </span>
                    <span className="font-medium">{format(trialStartedAt, "MMM d, yyyy")}</span>
                  </div>
                )}
                {trialEndsAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {isTrialExpired ? "Expired" : "Expires"}
                    </span>
                    <span className={cn("font-medium", isTrialExpired && "text-destructive")}>
                      {format(trialEndsAt, "MMM d, yyyy")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Plan Status Card */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium text-foreground">Workspace Plan</p>
                <p className="text-xs text-muted-foreground">Your current plan and status</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{planDisplayName}</Badge>
                {getStatusBadge()}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{planDisplayName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Asset Limit</span>
                <span className="font-medium">{plan.maxAssets.toLocaleString()}</span>
              </div>
              {plan.maxTeamMembers > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Team Limit</span>
                  <span className="font-medium">{plan.maxTeamMembers}</span>
                </div>
              )}
            </div>

            {plan.isOverLimit && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Limit Reached</p>
                  <p className="text-muted-foreground">
                    Upgrade to continue adding data.
                  </p>
                </div>
              </div>
            )}

            {plan.isReadOnly && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Read-Only Mode</p>
                  <p className="text-muted-foreground">
                    This workspace is in read-only mode. Upgrade to continue making changes.
                  </p>
                </div>
              </div>
            )}

            {plan.status === "active" && !plan.isOverLimit && !isTrialing && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-success">Active Workspace</p>
                  <p className="text-muted-foreground">
                    You have full access to all features in your plan.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Usage Limits Card */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <p className="font-medium text-foreground">Usage</p>
              <p className="text-xs text-muted-foreground">Current plan usage</p>
            </div>
            
            <UsageLimitIndicator />
          </div>
        </div>
      </Card>

      {/* Pricing Table */}
      <div className="pt-2">
        <h2 className="text-lg font-semibold text-foreground mb-4">Plans & Pricing</h2>
        <PricingTable currentPlan={plan.plan} />
      </div>
    </div>
  );
};
