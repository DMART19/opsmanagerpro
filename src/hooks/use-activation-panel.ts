/**
 * useActivationPanel - Determines if the activation/onboarding panel should show.
 *
 * Shows ONLY when:
 * 1. User just completed onboarding but hasn't done first_login_completed
 * 2. Workspace is empty (0 assets AND 0 team members)
 * 3. User has never performed a meaningful action
 *
 * Hides for returning users with data.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedStats } from "@/hooks/use-unified-stats";
import { useBoxes } from "@/hooks/use-boxes";

export function useActivationPanel() {
  const queryClient = useQueryClient();
  const { assets, team, loading: statsLoading } = useUnifiedStats();
  const { boxes, isLoading: boxesLoading } = useBoxes();

  const { data: profileFlags, isLoading: profileLoading } = useQuery({
    queryKey: ["activation-profile-flags"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("profiles")
        .select("onboarding_complete, first_login_completed")
        .eq("id", user.id)
        .single();

      return data as { onboarding_complete: boolean; first_login_completed: boolean } | null;
    },
    staleTime: 30_000,
  });

  const { data: hasActions = false, isLoading: actionsLoading } = useQuery({
    queryKey: ["activation-meaningful-actions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return true; // safe default: hide panel

      // Check product_events for meaningful actions
      const meaningfulTypes = [
        "asset_created",
        "container_created",
        "team_member_added",
        "credential_added",
      ];

      const { count, error } = await supabase
        .from("product_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("event_type", meaningfulTypes);

      if (error) return false;
      return (count ?? 0) > 0;
    },
    staleTime: 30_000,
  });

  const loading = statsLoading || boxesLoading || profileLoading || actionsLoading;

  const workspaceHasData = assets.total > 0 || team.total > 0 || (boxes?.length ?? 0) > 0;

  // Determine visibility
  let shouldShow = false;

  if (!loading && profileFlags) {
    const justOnboarded = profileFlags.onboarding_complete && !profileFlags.first_login_completed;
    const workspaceEmpty = !workspaceHasData;
    const noMeaningfulActions = !hasActions;

    // Show if any condition is true
    if (justOnboarded || workspaceEmpty || noMeaningfulActions) {
      shouldShow = true;
    }

    // But HIDE if user is fully onboarded AND workspace has data AND has actions
    if (profileFlags.first_login_completed && workspaceHasData && hasActions) {
      shouldShow = false;
    }
  }

  const markFirstLoginCompleted = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ first_login_completed: true } as any)
      .eq("id", user.id);

    queryClient.invalidateQueries({ queryKey: ["activation-profile-flags"] });
    queryClient.invalidateQueries({ queryKey: ["activation-meaningful-actions"] });
  };

  return {
    shouldShow,
    loading,
    workspaceHasData,
    markFirstLoginCompleted,
  };
}
