/**
 * Hook for checking subscription access, feature gating, and usage limits
 * 
 * In DEMO MODE: All actions are allowed (no subscription checks)
 * In TRIAL MODE: Features unlocked, but resource creation capped by trial limits
 */

import { useState, useCallback } from "react";
import { useSubscriptionOptional, GatedFeature, PLAN_DISPLAY_NAMES } from "@/contexts/SubscriptionContext";
import { useTourMode } from "@/contexts/TourModeContext";
import { useSuperAdmin } from "@/hooks/use-super-admin";
import { useNavigate, useLocation } from "react-router-dom";
import { trackFriction } from "@/lib/track-friction";
import { useTrialLimits, type TrialUsage } from "@/hooks/use-trial-limits";
import { type TrialLimitKey } from "@/config/trial-limits";

export type LimitType = "assets" | "team" | "readonly" | "feature" | "trial";

export const useAccessControl = () => {
  const location = useLocation();
  const subscriptionContext = useSubscriptionOptional();
  const { isTourMode } = useTourMode();
  const { isSuperAdmin } = useSuperAdmin();
  const { isTrialing, canCreate: canCreateTrial, refresh: refreshTrialUsage, usage: trialUsage } = useTrialLimits();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitType, setLimitType] = useState<LimitType>("readonly");
  const [featureName, setFeatureName] = useState<string>("");
  const [requiredPlanName, setRequiredPlanName] = useState<string>("");

  // Check if adding an asset is allowed
  const canAddAsset = useCallback((): boolean => {
    if (isTourMode || isSuperAdmin) return true;
    if (!subscriptionContext) return true;
    return subscriptionContext.canAddAsset();
  }, [isTourMode, isSuperAdmin, subscriptionContext]);

  // Check general write access
  const canWrite = useCallback((): boolean => {
    if (isTourMode || isSuperAdmin) return true;
    if (!subscriptionContext) return true;
    return subscriptionContext.checkWriteAccess();
  }, [isTourMode, isSuperAdmin, subscriptionContext]);

  // Check feature access by plan tier
  const hasFeature = useCallback((feature: GatedFeature): boolean => {
    if (isTourMode || isSuperAdmin) return true;
    if (!subscriptionContext) return true;
    return subscriptionContext.hasFeatureAccess(feature);
  }, [isTourMode, isSuperAdmin, subscriptionContext]);

  // Show upgrade modal when action is blocked
  const showUpgradePrompt = useCallback((type: LimitType, feature?: string, requiredPlan?: string) => {
    setLimitType(type);
    setFeatureName(feature || "");
    setRequiredPlanName(requiredPlan || "");
    setShowLimitModal(true);
    
    // Track as friction event
    trackFriction("gated_feature_attempt", location.pathname, feature || type, {
      limitType: type,
      feature: feature || null,
      requiredPlan: requiredPlan || null,
    });
  }, [location.pathname]);

  // Try to perform an action, show modal if blocked
  const tryAddAsset = useCallback((): boolean => {
    if (isTourMode || isSuperAdmin) return true;
    if (!subscriptionContext) return true;
    
    const { plan, usageLimits } = subscriptionContext;
    
    if (plan.isReadOnly) {
      showUpgradePrompt("readonly");
      return false;
    }

    // Trial limit check
    if (isTrialing) {
      const check = canCreateTrial("assets");
      if (!check.allowed) {
        showUpgradePrompt("trial", "Assets");
        return false;
      }
    }
    
    if (usageLimits.isAtAssetLimit) {
      showUpgradePrompt("assets");
      return false;
    }
    
    return true;
  }, [isTourMode, isSuperAdmin, subscriptionContext, showUpgradePrompt, isTrialing, canCreateTrial]);

  const tryAddTeamMember = useCallback((): boolean => {
    if (isTourMode || isSuperAdmin) return true;
    if (!subscriptionContext) return true;

    const { plan, usageLimits } = subscriptionContext;

    // Check if team feature is gated (feature-level lock)
    if (!subscriptionContext.hasFeatureAccess("Team")) {
      const required = subscriptionContext.getRequiredPlan("Team");
      const planName = PLAN_DISPLAY_NAMES[required];
      console.warn(`Feature access blocked: create_employee requires ${planName} plan`);
      showUpgradePrompt("feature", "Team Members", planName);
      return false;
    }

    if (plan.isReadOnly) {
      console.warn("Write access blocked: workspace is read-only");
      showUpgradePrompt("readonly");
      return false;
    }

    // Trial limit check
    if (isTrialing) {
      const check = canCreateTrial("teamMembers");
      if (!check.allowed) {
        showUpgradePrompt("trial", "Team Members");
        return false;
      }
    }

    if (usageLimits.isAtTeamLimit) {
      console.warn(`Team member limit reached: ${usageLimits.currentTeamMembers}/${usageLimits.maxTeamMembers}`);
      showUpgradePrompt("team");
      return false;
    }

    return true;
  }, [isTourMode, isSuperAdmin, subscriptionContext, showUpgradePrompt, isTrialing, canCreateTrial]);

  const tryWrite = useCallback((): boolean => {
    if (isTourMode || isSuperAdmin) return true;
    if (!subscriptionContext) return true;
    
    if (!subscriptionContext.checkWriteAccess()) {
      showUpgradePrompt("readonly");
      return false;
    }
    
    return true;
  }, [isTourMode, isSuperAdmin, subscriptionContext, showUpgradePrompt]);

  const tryFeature = useCallback((feature: GatedFeature): boolean => {
    if (isTourMode || isSuperAdmin) return true;
    if (!subscriptionContext) return true;

    // Check feature access by plan tier
    if (!subscriptionContext.hasFeatureAccess(feature)) {
      const required = subscriptionContext.getRequiredPlan(feature);
      const planName = PLAN_DISPLAY_NAMES[required];
      console.warn(`Feature access blocked: ${feature} requires ${planName} plan`);
      showUpgradePrompt("feature", feature, planName);
      return false;
    }
    
    // Check write access
    if (!subscriptionContext.checkWriteAccess()) {
      console.warn(`Write access blocked: workspace is read-only`);
      showUpgradePrompt("readonly");
      return false;
    }
    
    return true;
  }, [subscriptionContext, showUpgradePrompt, isTourMode, isSuperAdmin]);

  /**
   * Generic trial-aware creation check for any resource type.
   * Shows upgrade modal if trial limit is reached.
   */
  const tryCreate = useCallback((key: TrialLimitKey, label?: string): boolean => {
    if (isTourMode || isSuperAdmin) return true;
    if (!subscriptionContext) return true;

    if (subscriptionContext.plan.isReadOnly) {
      showUpgradePrompt("readonly");
      return false;
    }

    if (isTrialing) {
      const check = canCreateTrial(key);
      if (!check.allowed) {
        showUpgradePrompt("trial", label || check.message);
        return false;
      }
    }

    return true;
  }, [isTourMode, isSuperAdmin, subscriptionContext, showUpgradePrompt, isTrialing, canCreateTrial]);

  /** Get the display name of the plan required for a feature (no side effects) */
  const getRequiredPlanName = useCallback((feature: GatedFeature): string => {
    if (!subscriptionContext) return "";
    const required = subscriptionContext.getRequiredPlan(feature);
    return PLAN_DISPLAY_NAMES[required];
  }, [subscriptionContext]);

  // Refresh usage counts after mutations
  const refreshUsage = useCallback(async () => {
    if (subscriptionContext) {
      await subscriptionContext.refreshUsageLimits();
    }
    await refreshTrialUsage();
  }, [subscriptionContext, refreshTrialUsage]);

  return {
    // Status checks
    canAddAsset,
    canWrite,
    hasFeature,
    isReadOnly: isSuperAdmin ? false : (subscriptionContext?.plan.isReadOnly ?? false),
    isOverLimit: isSuperAdmin ? false : (subscriptionContext?.plan.isOverLimit ?? false),
    isPastDue: isSuperAdmin ? false : (subscriptionContext?.plan.isPastDue ?? false),
    isArchived: isSuperAdmin ? false : (subscriptionContext?.plan.isArchived ?? false),
    workspaceStatus: isSuperAdmin ? "active" as const : (subscriptionContext?.plan.workspaceStatus ?? "active"),
    isLoading: subscriptionContext?.plan.loading ?? true,
    currentPlan: subscriptionContext?.plan.plan ?? "inventory",
    isTrialing,
    
    // Action attempts (with modal on failure)
    tryAddAsset,
    tryAddTeamMember,
    tryWrite,
    tryFeature,
    tryCreate,
    getRequiredPlanName,
    
    // Usage info
    usageLimits: subscriptionContext?.usageLimits ?? {
      maxAssets: 1000,
      currentAssets: 0,
      assetsRemaining: 1000,
      isAtAssetLimit: false,
      percentUsed: 0,
      maxTeamMembers: 5,
      currentTeamMembers: 0,
      teamMembersRemaining: 5,
      isAtTeamLimit: false,
      teamPercentUsed: 0,
    },
    trialUsage,
    
    // Modal state
    showLimitModal,
    limitType,
    featureName,
    requiredPlanName,
    closeLimitModal: () => setShowLimitModal(false),
    
    // Refresh after mutations
    refreshUsage,
  };
};
