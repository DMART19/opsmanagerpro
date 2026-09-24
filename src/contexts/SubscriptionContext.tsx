/**
 * Subscription Context - Manages plan & subscription state
 * 
 * Provides:
 * - Plan type (inventory, operations, operations_pro) with asset/team limits
 * - Plan status (active, over_limit, read_only)
 * - Usage limits tracking and enforcement
 * - Feature gating by plan tier
 * - Read-only mode for blocked workspaces
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isTourActive } from "@/contexts/TourModeContext";
import {
  type PlanId,
  type PlanFeature,
  PLANS,
  isFeatureEnabled,
  getRequiredPlan as getRequiredPlanForFeature,
} from "@/config/plans";

export type PlanType = PlanId;
export type PlanStatus = "active" | "over_limit" | "read_only" | "past_due" | "archived";
export type WorkspaceStatus = "active" | "past_due" | "read_only" | "archived";

// Re-export from plans.ts so existing imports keep working
export { PLAN_DISPLAY_NAMES, PLAN_PRICES } from "@/config/plans";

// Legacy GatedFeature type — maps to module-level PlanFeature keys
export type GatedFeature = "Team" | "Credentials" | "Calendar" | "Pallet Builder";

// Map legacy feature names to canonical PlanFeature keys
const LEGACY_FEATURE_MAP: Record<GatedFeature, PlanFeature> = {
  "Team": "team_directory_member_profiles",
  "Credentials": "credential_definitions_assignment",
  "Calendar": "calendar_views",
  "Pallet Builder": "pallet_builder",
};

export interface PlanState {
  plan: PlanType;
  status: PlanStatus;
  workspaceStatus: WorkspaceStatus;
  maxAssets: number;
  maxTeamMembers: number;
  isReadOnly: boolean;
  isOverLimit: boolean;
  isPastDue: boolean;
  isArchived: boolean;
  isTrialing: boolean;
  subscriptionEndDate: string | null;
  archivedAt: string | null;
  loading: boolean;
}

export interface UsageLimits {
  maxAssets: number;
  currentAssets: number;
  assetsRemaining: number;
  isAtAssetLimit: boolean;
  percentUsed: number;
  maxTeamMembers: number;
  currentTeamMembers: number;
  teamMembersRemaining: number;
  isAtTeamLimit: boolean;
  teamPercentUsed: number;
}

interface SubscriptionContextType {
  plan: PlanState;
  usageLimits: UsageLimits;
  checkWriteAccess: () => boolean;
  canAddAsset: () => boolean;
  canAddTeamMember: () => boolean;
  hasFeatureAccess: (feature: GatedFeature) => boolean;
  getRequiredPlan: (feature: GatedFeature) => PlanType;
  refreshPlan: () => Promise<void>;
  refreshUsageLimits: () => Promise<void>;
}

const PLAN_LIMITS = {
  inventory: { assets: PLANS.inventory.asset_limit, team: PLANS.inventory.max_users },
  operations: { assets: PLANS.operations.asset_limit, team: PLANS.operations.max_users },
  operations_pro: { assets: PLANS.operations_pro.asset_limit, team: PLANS.operations_pro.max_users },
  enterprise: { assets: PLANS.enterprise.asset_limit, team: PLANS.enterprise.max_users },
} as const;

const defaultPlan: PlanState = {
  plan: "inventory",
  status: "active",
  workspaceStatus: "active",
  maxAssets: PLAN_LIMITS.inventory.assets,
  maxTeamMembers: PLAN_LIMITS.inventory.team,
  isReadOnly: false,
  isOverLimit: false,
  isPastDue: false,
  isArchived: false,
  isTrialing: true,
  subscriptionEndDate: null,
  archivedAt: null,
  loading: true,
};

const defaultUsageLimits: UsageLimits = {
  maxAssets: PLAN_LIMITS.inventory.assets,
  currentAssets: 0,
  assetsRemaining: PLAN_LIMITS.inventory.assets,
  isAtAssetLimit: false,
  percentUsed: 0,
  maxTeamMembers: PLAN_LIMITS.inventory.team,
  currentTeamMembers: 0,
  teamMembersRemaining: PLAN_LIMITS.inventory.team,
  isAtTeamLimit: false,
  teamPercentUsed: 0,
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const [plan, setPlan] = useState<PlanState>(defaultPlan);
  const [usageLimits, setUsageLimits] = useState<UsageLimits>(defaultUsageLimits);

  const loadPlan = useCallback(async () => {
    try {
      // Tour mode: synthesize a default trial plan and skip all Supabase calls.
      if (isTourActive()) {
        setPlan({ ...defaultPlan, loading: false });
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPlan({ ...defaultPlan, loading: false });
        return;
      }

      const { data: planData, error } = await supabase
        .from("workspace_plans")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading plan:", error);
        setPlan({ ...defaultPlan, loading: false });
        return;
      }

      if (!planData) {
        // Create default plan for new users
        const { error: insertError } = await supabase
          .from("workspace_plans")
          .insert({
            user_id: user.id,
            plan: "inventory" as any,
            status: "active" as any,
            max_assets: PLAN_LIMITS.inventory.assets,
            max_team_members: PLAN_LIMITS.inventory.team,
          })
          .select()
          .single();
        
        if (insertError) {
          console.error("Error creating workspace plan:", insertError);
          setPlan({ ...defaultPlan, loading: false });
          return;
        }
        
        setPlan({
          plan: "inventory",
          status: "active",
          workspaceStatus: "active",
          maxAssets: PLAN_LIMITS.inventory.assets,
          maxTeamMembers: PLAN_LIMITS.inventory.team,
          isReadOnly: false,
          isOverLimit: false,
          isPastDue: false,
          isArchived: false,
          isTrialing: true,
          subscriptionEndDate: null,
          archivedAt: null,
          loading: false,
        });
        return;
      }

      const status = planData.status as PlanStatus;
      const planType = (planData.plan as unknown as string) as PlanType;
      const limits = PLAN_LIMITS[planType] || PLAN_LIMITS.inventory;
      const wsStatus = ((planData as any).workspace_status || "active") as WorkspaceStatus;
      
      // Detect trial: must be on the trial status AND before the trial end date.
      // Matches the server rule in plan_check_feature so paid plans never inherit
      // trial-wide feature access.
      const trialEndDate = (planData as any).trial_end_date;
      const trialActive = trialEndDate ? new Date(trialEndDate) > new Date() : false;
      const rawStatus = planData.status as string;
      const isTrialing = rawStatus === "trial" && trialActive;
      // A trial whose end date has passed is read-only even before the expiry job runs.
      const trialLapsed = rawStatus === "trial" && !trialActive;

      setPlan({
        plan: planType,
        status,
        workspaceStatus: wsStatus,
        maxAssets: planData.max_assets || limits.assets,
        maxTeamMembers: (planData as any).max_team_members ?? limits.team,
        isReadOnly: wsStatus === "read_only" || wsStatus === "archived" || status === "read_only" || trialLapsed,
        isOverLimit: status === "over_limit",
        isPastDue: wsStatus === "past_due",
        isArchived: wsStatus === "archived",
        isTrialing,
        subscriptionEndDate: (planData as any).subscription_end_date || null,
        archivedAt: (planData as any).archived_at || null,
        loading: false,
      });
    } catch (error) {
      console.error("Error in loadPlan:", error);
      setPlan({ ...defaultPlan, loading: false });
    }
  }, []);

  const loadUsageLimits = useCallback(async () => {
    try {
      if (isTourActive()) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get asset count
      const { count: assetCount, error: countError } = await supabase
        .from("equipment")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (countError) {
        console.error("Error counting assets:", countError);
        return;
      }

      // Get team member count
      const { count: teamCount, error: teamError } = await supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (teamError) {
        console.error("Error counting team members:", teamError);
      }

      const currentAssets = assetCount || 0;
      const maxAssets = plan.maxAssets || PLAN_LIMITS.inventory.assets;
      const assetsRemaining = Math.max(0, maxAssets - currentAssets);
      const percentUsed = maxAssets > 0 ? Math.min(100, (currentAssets / maxAssets) * 100) : 0;

      const currentTeamMembers = teamCount || 0;
      const maxTeamMembers = plan.maxTeamMembers;
      const teamMembersRemaining = maxTeamMembers > 0 ? Math.max(0, maxTeamMembers - currentTeamMembers) : 0;
      const teamPercentUsed = maxTeamMembers > 0 ? Math.min(100, (currentTeamMembers / maxTeamMembers) * 100) : 0;

      setUsageLimits({
        maxAssets,
        currentAssets,
        assetsRemaining,
        isAtAssetLimit: currentAssets >= maxAssets,
        percentUsed,
        maxTeamMembers,
        currentTeamMembers,
        teamMembersRemaining,
        isAtTeamLimit: maxTeamMembers > 0 ? currentTeamMembers >= maxTeamMembers : false,
        teamPercentUsed,
      });
    } catch (error) {
      console.error("Error in loadUsageLimits:", error);
    }
  }, [plan.maxAssets, plan.maxTeamMembers]);

  const checkWriteAccess = useCallback((): boolean => {
    if (plan.loading) return false;
    return !plan.isReadOnly;
  }, [plan]);

  const canAddAsset = useCallback((): boolean => {
    if (plan.loading) return false;
    if (plan.isReadOnly) return false;
    return !usageLimits.isAtAssetLimit;
  }, [plan, usageLimits]);

  const canAddTeamMember = useCallback((): boolean => {
    if (plan.loading) return false;
    if (plan.isReadOnly) return false;
    return !usageLimits.isAtTeamLimit;
  }, [plan, usageLimits]);

  const hasFeatureAccessFn = useCallback((feature: GatedFeature): boolean => {
    // During trial, all features are unlocked
    if (plan.isTrialing) return true;
    const canonicalFeature = LEGACY_FEATURE_MAP[feature];
    return isFeatureEnabled(plan.plan, canonicalFeature) ||
      PLANS[plan.plan].partial_features.some((p) => p.feature === canonicalFeature);
  }, [plan.plan, plan.isTrialing]);

  const getRequiredPlanFn = useCallback((feature: GatedFeature): PlanType => {
    const canonicalFeature = LEGACY_FEATURE_MAP[feature];
    return getRequiredPlanForFeature(canonicalFeature);
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    if (!plan.loading) {
      loadUsageLimits();
    }
  }, [plan.loading, loadUsageLimits]);

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only react to meaningful auth changes, NOT token refreshes
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;

      if (event === 'SIGNED_IN' && session?.user?.id) {
        (supabase.rpc as any)('ensure_workspace_integrity', { p_user_id: session.user.id })
          .then(({ error }: any) => {
            if (error) {
              console.warn("ensure_workspace_integrity failed in auth listener:", error?.message || error);
            }
          });
      }

      void loadPlan();
    });

    return () => authSub.unsubscribe();
  }, [loadPlan]);

  return (
    <SubscriptionContext.Provider value={{
      plan,
      usageLimits,
      checkWriteAccess,
      canAddAsset,
      canAddTeamMember,
      hasFeatureAccess: hasFeatureAccessFn,
      getRequiredPlan: getRequiredPlanFn,
      refreshPlan: loadPlan,
      refreshUsageLimits: loadUsageLimits,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};

// Optional hook that doesn't throw
export const useSubscriptionOptional = () => {
  return useContext(SubscriptionContext);
};

