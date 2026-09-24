/**
 * useOnboardingContext - Provides adaptive onboarding intelligence.
 *
 * Tracks login count, signup source, use case, and profile completeness
 * to drive contextual onboarding experiences.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

export type SignupSource = "direct" | "invite" | "oauth";
export type PrimaryUseCase = "inventory" | "equipment" | "compliance" | "warehouse_operations" | "";

interface OnboardingProfile {
  login_count: number;
  last_login_at: string | null;
  signup_source: SignupSource;
  primary_use_case: PrimaryUseCase;
  team_size: string | null;
  industry: string | null;
  profile_completeness: number;
  display_name: string | null;
  onboarding_complete: boolean;
  first_login_completed: boolean;
}

interface OnboardingContext {
  profile: OnboardingProfile | null;
  loading: boolean;
  /** Whether this is the user's very first session */
  isFirstSession: boolean;
  /** Whether the user came from a workspace invite */
  isInvitedUser: boolean;
  /** Whether profile is missing optional fields (team_size, industry) */
  needsProgressiveProfile: boolean;
  /** Current profile completeness percentage */
  completeness: number;
  /** Record a login event (increments counter) */
  recordLogin: () => Promise<void>;
  /** Update signup source */
  setSignupSource: (source: SignupSource) => Promise<void>;
  /** Update progressive profile fields */
  updateProfileFields: (fields: { team_size?: string; industry?: string }) => Promise<void>;
}

function calculateCompleteness(profile: OnboardingProfile): number {
  let score = 0;
  const total = 6;

  if (profile.display_name) score++;
  if (profile.primary_use_case) score++;
  if (profile.onboarding_complete) score++;
  if (profile.team_size) score++;
  if (profile.industry) score++;
  if (profile.first_login_completed) score++;

  return Math.round((score / total) * 100);
}

export function useOnboardingContext(): OnboardingContext {
  const queryClient = useQueryClient();

  const { data: profile = null, isLoading } = useQuery({
    queryKey: ["onboarding-context"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("login_count, last_login_at, signup_source, primary_use_case, team_size, industry, profile_completeness, display_name, onboarding_complete, first_login_completed")
        .eq("id", user.id)
        .single();

      if (error || !data) return null;
      return data as unknown as OnboardingProfile;
    },
    staleTime: 60_000,
  });

  const isFirstSession = profile ? profile.login_count <= 1 : false;
  const isInvitedUser = profile?.signup_source === "invite";
  const completeness = profile ? calculateCompleteness(profile) : 0;
  const needsProgressiveProfile = profile
    ? profile.onboarding_complete && (!profile.team_size || !profile.industry) && profile.login_count >= 2
    : false;

  const recordLogin = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        login_count: (profile?.login_count ?? 0) + 1,
        last_login_at: new Date().toISOString(),
      } as any)
      .eq("id", user.id);

    queryClient.invalidateQueries({ queryKey: ["onboarding-context"] });
  }, [profile?.login_count, queryClient]);

  const setSignupSource = useCallback(async (source: SignupSource) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ signup_source: source } as any)
      .eq("id", user.id);

    queryClient.invalidateQueries({ queryKey: ["onboarding-context"] });
  }, [queryClient]);

  const updateProfileFields = useCallback(async (fields: { team_size?: string; industry?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updateData: Record<string, unknown> = { ...fields };
    // Recalculate completeness
    if (profile) {
      const updated = { ...profile, ...fields };
      updateData.profile_completeness = calculateCompleteness(updated);
    }

    await supabase
      .from("profiles")
      .update(updateData as any)
      .eq("id", user.id);

    queryClient.invalidateQueries({ queryKey: ["onboarding-context"] });
  }, [profile, queryClient]);

  return {
    profile,
    loading: isLoading,
    isFirstSession,
    isInvitedUser,
    needsProgressiveProfile,
    completeness,
    recordLogin,
    setSignupSource,
    updateProfileFields,
  };
}
