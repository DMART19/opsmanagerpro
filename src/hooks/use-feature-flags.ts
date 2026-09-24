/**
 * Hook for checking platform feature flags.
 * 
 * Usage:
 *   const { isEnabled, loading } = useFeatureFlag("beta_pallet_builder_v2");
 *   const { flags, loading } = useFeatureFlags();
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureFlag {
  id: string;
  flag_key: string;
  name: string;
  description: string | null;
  category: string;
  is_enabled: boolean;
  rollout_percentage: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  status: string;
  environment: string;
  owner: string | null;
  scheduled_at: string | null;
  expires_at: string | null;
  notes: string | null;
}

export interface WorkspaceFeatureFlag {
  id: string;
  flag_id: string;
  workspace_id: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/** Fetch all feature flags (admin use) */
export const useFeatureFlags = () => {
  return useQuery({
    queryKey: ["feature-flags"],
    queryFn: async (): Promise<FeatureFlag[]> => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return (data as unknown as FeatureFlag[]) || [];
    },
  });
};

/** Check if a specific feature flag is enabled (for app components).
 * Uses the server-side resolver so the flag catalogue itself stays admin-only. */
export const useFeatureFlag = (flagKey: string) => {
  const { data, isLoading } = useQuery({
    queryKey: ["feature-flag", flagKey],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("is_feature_enabled", {
        p_flag_key: flagKey,
        p_workspace_id: null,
      });

      if (error || data == null) return false;
      return data === true;
    },
    staleTime: 60_000, // Cache for 1 minute
  });

  return { isEnabled: data ?? false, loading: isLoading };
};


/** Fetch workspace-level overrides for a specific flag */
export const useWorkspaceFlagOverrides = (flagId: string | null) => {
  return useQuery({
    queryKey: ["workspace-feature-flags", flagId],
    queryFn: async (): Promise<WorkspaceFeatureFlag[]> => {
      if (!flagId) return [];
      const { data, error } = await supabase
        .from("workspace_feature_flags")
        .select("*")
        .eq("flag_id", flagId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as unknown as WorkspaceFeatureFlag[]) || [];
    },
    enabled: !!flagId,
  });
};
