/**
 * useFeatureAccess — Hook for checking feature flag access against the workspace plan.
 *
 * Usage:
 *   const { access, isAvailable, isFull, isPartial, isLocked, requiredPlanName } = useFeatureAccess(FEATURES.pallet_builder);
 *
 * Super admins and demo mode bypass all gates.
 */

import { useMemo } from "react";
import { useSubscriptionOptional } from "@/contexts/SubscriptionContext";
import { useTourMode } from "@/contexts/TourModeContext";
import { useSuperAdmin } from "@/hooks/use-super-admin";
import {
  type FeatureFlag,
  type FeatureAccess,
  getFeatureAccess,
  getRequiredPlanName,
} from "@/config/feature-flags";
import type { PlanId } from "@/config/plans";

interface UseFeatureAccessResult {
  /** Raw access object: { enabled, level, partialLabel? } */
  access: FeatureAccess;
  /** true when feature is full or partial */
  isAvailable: boolean;
  /** true only when full access */
  isFull: boolean;
  /** true only when partial access (check partialLabel for level) */
  isPartial: boolean;
  /** true when feature is completely locked */
  isLocked: boolean;
  /** Partial access label, e.g. "Manual Entry", "Limited" */
  partialLabel: string | undefined;
  /** Display name of the lowest plan that fully enables this feature */
  requiredPlanName: string;
  /** Still loading plan data */
  loading: boolean;
}

const FULL_ACCESS: FeatureAccess = { enabled: true, level: "full" };

export function useFeatureAccess(flag: FeatureFlag): UseFeatureAccessResult {
  const subscriptionContext = useSubscriptionOptional();
  const { isTourMode } = useTourMode();
  const { isSuperAdmin } = useSuperAdmin();

  return useMemo(() => {
    const loading = !subscriptionContext || subscriptionContext.plan.loading;
    const planId: PlanId = subscriptionContext?.plan.plan ?? "inventory";

    // Super admins, demo mode, and trial users bypass all gates
    const isTrialing = subscriptionContext?.plan.isTrialing ?? false;
    const bypass = isTourMode || isSuperAdmin || isTrialing;

    const access = bypass ? FULL_ACCESS : getFeatureAccess(planId, flag);
    const reqPlanName = getRequiredPlanName(flag);

    return {
      access,
      isAvailable: bypass || access.enabled,
      isFull: bypass || access.level === "full",
      isPartial: !bypass && access.level === "partial",
      isLocked: !bypass && !access.enabled,
      partialLabel: access.partialLabel,
      requiredPlanName: reqPlanName,
      loading: loading && !bypass,
    };
  }, [subscriptionContext, isTourMode, isSuperAdmin, flag]);
}

/**
 * Check multiple feature flags at once.
 * Returns a map of flag → UseFeatureAccessResult.
 */
export function useMultiFeatureAccess(flags: FeatureFlag[]): Record<FeatureFlag, UseFeatureAccessResult> {
  const subscriptionContext = useSubscriptionOptional();
  const { isTourMode } = useTourMode();
  const { isSuperAdmin } = useSuperAdmin();

  return useMemo(() => {
    const loading = !subscriptionContext || subscriptionContext.plan.loading;
    const planId: PlanId = subscriptionContext?.plan.plan ?? "inventory";
    const isTrialing = subscriptionContext?.plan.isTrialing ?? false;
    const bypass = isTourMode || isSuperAdmin || isTrialing;

    const result: Record<string, UseFeatureAccessResult> = {};

    for (const flag of flags) {
      const access = bypass ? FULL_ACCESS : getFeatureAccess(planId, flag);
      const reqPlanName = getRequiredPlanName(flag);

      result[flag] = {
        access,
        isAvailable: bypass || access.enabled,
        isFull: bypass || access.level === "full",
        isPartial: !bypass && access.level === "partial",
        isLocked: !bypass && !access.enabled,
        partialLabel: access.partialLabel,
        requiredPlanName: reqPlanName,
        loading: loading && !bypass,
      };
    }

    return result;
  }, [subscriptionContext, isTourMode, isSuperAdmin, flags]);
}
