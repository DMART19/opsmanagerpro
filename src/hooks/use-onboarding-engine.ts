/**
 * useOnboardingEngine — Live-count onboarding state.
 *
 * Derives step completion from actual record counts in the database
 * (cache_inventory, cache_boxes, tasks) rather than stored booleans.
 * Steps revert to incomplete when records are deleted.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

export interface OnboardingState {
  asset_created: boolean;
  container_created: boolean;
  event_created: boolean;
  onboarding_complete: boolean;
  asset_completed_at: string | null;
  container_completed_at: string | null;
  event_completed_at: string | null;
  completed_at: string | null;
}

const DEFAULT_STATE: OnboardingState = {
  asset_created: false,
  container_created: false,
  event_created: false,
  onboarding_complete: false,
  asset_completed_at: null,
  container_completed_at: null,
  event_completed_at: null,
  completed_at: null,
};

export function useOnboardingEngine() {
  const queryClient = useQueryClient();

  const { data: state = null, isLoading } = useQuery({
    queryKey: ["onboarding-engine-state"],
    queryFn: async (): Promise<OnboardingState | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Run three count queries in parallel for live data
      const [assetsResult, containersResult, tasksResult] = await Promise.all([
        supabase
          .from("cache_inventory")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("deleted_at", null),
        supabase
          .from("cache_boxes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        (supabase as any)
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      const assetCount = assetsResult.count ?? 0;
      const containerCount = containersResult.count ?? 0;
      const taskCount = tasksResult.count ?? 0;

      const hasAsset = assetCount > 0;
      const hasContainer = containerCount > 0;
      const hasTask = taskCount > 0;
      const allDone = hasAsset && hasContainer && hasTask;

      // Sync the workspace_onboarding row so other systems stay consistent
      try {
        await (supabase as any)
          .from("workspace_onboarding")
          .upsert(
            {
              user_id: user.id,
              asset_created: hasAsset,
              container_created: hasContainer,
              event_created: hasTask,
              onboarding_complete: allDone,
              ...(hasAsset ? { asset_completed_at: new Date().toISOString() } : { asset_completed_at: null }),
              ...(hasContainer ? { container_completed_at: new Date().toISOString() } : { container_completed_at: null }),
              ...(hasTask ? { event_completed_at: new Date().toISOString() } : { event_completed_at: null }),
              ...(allDone ? { completed_at: new Date().toISOString() } : { completed_at: null }),
            },
            { onConflict: "user_id" }
          );
      } catch {
        // Non-critical — UI still shows correct live state
      }

      return {
        asset_created: hasAsset,
        container_created: hasContainer,
        event_created: hasTask,
        onboarding_complete: allDone,
        asset_completed_at: null,
        container_completed_at: null,
        event_completed_at: null,
        completed_at: null,
      };
    },
    staleTime: 5_000,
    refetchOnMount: "always",
  });

  const completedCount = state
    ? [state.asset_created, state.container_created, state.event_created].filter(Boolean).length
    : 0;

  const totalTasks = 3;
  const allComplete = completedCount === totalTasks;
  const isOnboarding = state !== null && !allComplete;

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["onboarding-engine-state"] });
  }, [queryClient]);

  return {
    state: state ?? DEFAULT_STATE,
    loading: isLoading,
    completedCount,
    totalTasks,
    allComplete,
    isOnboarding,
    refresh,
  };
}
