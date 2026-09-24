/**
 * Usage Limit Indicator - Shows current usage vs limits for assets and team
 */

import { AlertTriangle, Package, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useSubscription, PLAN_DISPLAY_NAMES } from "@/contexts/SubscriptionContext";
import { cn } from "@/lib/utils";

interface UsageLimitIndicatorProps {
  compact?: boolean;
  className?: string;
}

export const UsageLimitIndicator = ({ compact = false, className }: UsageLimitIndicatorProps) => {
  const { usageLimits, plan } = useSubscription();

  const { currentAssets, maxAssets, isAtAssetLimit, percentUsed } = usageLimits;
  const isWarning = percentUsed >= 80;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-xs", className)}>
        {isAtAssetLimit && <AlertTriangle className="h-3 w-3 text-destructive" />}
        <span className={cn(
          isAtAssetLimit ? "text-destructive font-medium" : "text-muted-foreground"
        )}>
          {currentAssets} / {maxAssets} Assets
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Assets usage */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Assets</span>
          </div>
          <span className={cn(
            "font-medium",
            isAtAssetLimit ? "text-destructive" : isWarning ? "text-warning" : "text-foreground"
          )}>
            {currentAssets} / {maxAssets}
          </span>
        </div>
        <Progress 
          value={percentUsed} 
          className={cn(
            "h-2",
            isAtAssetLimit ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-warning" : ""
          )}
        />
        {isAtAssetLimit && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Limit reached. Upgrade to add more.
          </p>
        )}
      </div>

      {/* Team usage (only show if plan allows team) */}
      {plan.maxTeamMembers > 0 && !plan.loading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Team Members</span>
            </div>
            <span className={cn(
              "font-medium",
              usageLimits.isAtTeamLimit ? "text-destructive" : usageLimits.teamPercentUsed >= 80 ? "text-warning" : "text-foreground"
            )}>
              {usageLimits.currentTeamMembers} / {usageLimits.maxTeamMembers}
            </span>
          </div>
          <Progress 
            value={usageLimits.teamPercentUsed} 
            className={cn(
              "h-2",
              usageLimits.isAtTeamLimit ? "[&>div]:bg-destructive" : usageLimits.teamPercentUsed >= 80 ? "[&>div]:bg-warning" : ""
            )}
          />
          {usageLimits.isAtTeamLimit && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Team limit reached. Upgrade to add more.
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {PLAN_DISPLAY_NAMES[plan.plan]} Plan
      </p>
    </div>
  );
};
