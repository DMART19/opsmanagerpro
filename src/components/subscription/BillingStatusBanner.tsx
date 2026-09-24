/**
 * BillingStatusBanner - Shows contextual banners based on workspace billing lifecycle
 * 
 * States: active (no banner), past_due (warning), read_only (blocked), archived (locked)
 */

import { AlertTriangle, CreditCard, Archive, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { differenceInDays, isPast } from "date-fns";
import { useTourMode } from "@/contexts/TourModeContext";
import { useSuperAdmin } from "@/hooks/use-super-admin";

export const BillingStatusBanner = () => {
  const { plan, usageLimits } = useSubscription();
  const { workspaceSettings } = useSettings();
  const { isTourMode } = useTourMode();
  const { isSuperAdmin } = useSuperAdmin();
  const navigate = useNavigate();

  // Don't show in demo mode, for super admin, or while loading
  if (isTourMode || isSuperAdmin || plan.loading) return null;

  const workspaceStatus = plan.workspaceStatus;

  // Archived banner
  if (workspaceStatus === "archived") {
    return (
      <div className="w-full px-4 py-3 flex items-center justify-center gap-3 text-sm font-medium bg-destructive text-destructive-foreground">
        <Archive className="h-4 w-4 shrink-0" />
        <span>This workspace has been archived due to inactivity.</span>
        <Button
          size="sm"
          variant="secondary"
          className="ml-2 h-7 text-xs"
          onClick={() => navigate("/billing")}
        >
          Restore Workspace
        </Button>
      </div>
    );
  }

  // Trial expired (subscription_status still 'trialing' but trial_ends_at passed)
  const trialEndsAt = workspaceSettings.trial_ends_at ? new Date(workspaceSettings.trial_ends_at) : null;
  const subscriptionStatus = workspaceSettings.subscription_status || "trialing";
  const isTrialing = subscriptionStatus === "trialing";
  const isTrialExpired = trialEndsAt ? isPast(trialEndsAt) : false;

  // Read-only banner (covers both trial expiry and subscription expiry)
  if (workspaceStatus === "read_only" || (isTrialing && isTrialExpired)) {
    const isTrialCase = isTrialing && isTrialExpired;
    return (
      <div className="w-full px-4 py-3 flex items-center justify-center gap-3 text-sm font-medium bg-destructive/90 text-destructive-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          {isTrialCase
            ? "Your trial has ended. Subscribe to continue editing your workspace."
            : "Your subscription has expired. Your workspace is currently in read-only mode."}
        </span>
        <Button
          size="sm"
          variant="secondary"
          className="ml-2 h-7 text-xs"
          onClick={() => navigate("/billing")}
        >
          {isTrialCase ? "Subscribe Now" : "Update Billing"}
        </Button>
      </div>
    );
  }

  // Past due banner
  if (workspaceStatus === "past_due") {
    return (
      <div className="w-full px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium bg-warning/90 text-warning-foreground">
        <CreditCard className="h-4 w-4 shrink-0" />
        <span>Payment failed — update billing to restore access</span>
        <Button
          size="sm"
          variant="secondary"
          className="ml-2 h-7 text-xs"
          onClick={() => navigate("/billing")}
        >
          Update Billing
        </Button>
      </div>
    );
  }

  // Trial countdown banner (variables already declared above)
  const daysRemaining = trialEndsAt ? Math.max(0, differenceInDays(trialEndsAt, new Date())) : null;

  if (isTrialing && !isTrialExpired && daysRemaining !== null && daysRemaining <= 7) {
    return (
      <div
        className={cn(
          "w-full px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium",
          daysRemaining <= 3
            ? "bg-warning/90 text-warning-foreground"
            : "bg-primary/10 text-primary"
        )}
      >
        <Clock className="h-4 w-4" />
        <span>
          {daysRemaining === 0
            ? "Your trial expires today"
            : `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left in your free trial`}
        </span>
        <span className="hidden sm:inline text-xs opacity-80 ml-1">
          — Upgrade to keep full access
        </span>
      </div>
    );
  }

  // Over limit / approaching limit banners
  const isOverLimit = plan.isOverLimit;
  const isWarning = usageLimits.percentUsed >= 80 && usageLimits.percentUsed < 100;

  if (!isOverLimit && !isWarning) return null;

  return (
    <div
      className={cn(
        "w-full px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium",
        isOverLimit
          ? "bg-destructive text-destructive-foreground"
          : "bg-warning/90 text-warning-foreground"
      )}
    >
      {isOverLimit ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <TrendingUp className="h-4 w-4" />
      )}
      <span>
        {isOverLimit
          ? `Asset limit reached (${usageLimits.currentAssets} / ${usageLimits.maxAssets}). Upgrade to add more.`
          : `Approaching asset limit: ${usageLimits.currentAssets} / ${usageLimits.maxAssets} used`}
      </span>
    </div>
  );
};
