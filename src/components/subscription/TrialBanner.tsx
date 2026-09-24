/**
 * Plan Status Banner - Shows trial countdown and workspace status warnings
 */

import { AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import { differenceInDays, isPast } from "date-fns";

export const TrialBanner = () => {
  const { plan, usageLimits } = useSubscription();
  const { workspaceSettings } = useSettings();

  const trialEndsAt = workspaceSettings.trial_ends_at ? new Date(workspaceSettings.trial_ends_at) : null;
  const subscriptionStatus = workspaceSettings.subscription_status || "trialing";
  const isTrialing = subscriptionStatus === "trialing";
  const isTrialExpired = trialEndsAt ? isPast(trialEndsAt) : false;
  const daysRemaining = trialEndsAt ? Math.max(0, differenceInDays(trialEndsAt, new Date())) : null;

  // Don't show while loading
  if (plan.loading) return null;

  // Don't show if read-only (full-screen blocker handles that)
  if (plan.isReadOnly) return null;

  // Trial banner
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
