/**
 * useTrialLimits — Loads current usage counts and checks them against trial caps.
 *
 * Returns per-resource usage info and a helper to check if a creation action is allowed.
 * Only enforced when plan.isTrialing is true; paid plans bypass all limits.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionOptional } from "@/contexts/SubscriptionContext";
import {
  type TrialLimitKey,
  TRIAL_LIMITS,
  isTrialLimitReached,
  getTrialRemaining,
} from "@/config/trial-limits";

export interface TrialUsage {
  assets: number;
  containers: number;
  palletBuilds: number;
  trailerBuilds: number;
  calendarEvents: number;
  teamMembers: number;
}

const defaultUsage: TrialUsage = {
  assets: 0,
  containers: 0,
  palletBuilds: 0,
  trailerBuilds: 0,
  calendarEvents: 0,
  teamMembers: 0,
};

export function useTrialLimits() {
  const subscriptionContext = useSubscriptionOptional();
  const isTrialing = subscriptionContext?.plan.isTrialing ?? false;
  const [usage, setUsage] = useState<TrialUsage>(defaultUsage);
  const [loading, setLoading] = useState(true);

  const loadUsage = useCallback(async () => {
    if (!isTrialing) {
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Fire all counts in parallel
      const [assets, containers, pallets, trailers, events, team] = await Promise.all([
        // Assets (cache_inventory items, non-deleted)
        supabase
          .from("cache_inventory")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .then(r => r.count ?? 0),
        // Containers (cache_boxes)
        supabase
          .from("cache_boxes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .then(r => r.count ?? 0),
        // Pallet builds
        supabase
          .from("pallets")
          .select("id", { count: "exact", head: true })
          .eq("created_by", user.id)
          .then(r => r.count ?? 0),
        // Trailer builds
        supabase
          .from("custom_trailers")
          .select("id", { count: "exact", head: true })
          .eq("created_by", user.id)
          .then(r => r.count ?? 0),
        // Calendar events (tasks)
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .then(r => r.count ?? 0),
        // Team members
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .then(r => r.count ?? 0),
      ]);

      setUsage({
        assets,
        containers,
        palletBuilds: pallets,
        trailerBuilds: trailers,
        calendarEvents: events,
        teamMembers: team,
      });
    } catch (err) {
      console.error("Error loading trial usage:", err);
    } finally {
      setLoading(false);
    }
  }, [isTrialing]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  /**
   * Check if creating a new resource is allowed under trial limits.
   * Returns { allowed: true } or { allowed: false, message, limit, current }.
   */
  const canCreate = useCallback(
    (key: TrialLimitKey): { allowed: boolean; message?: string; limit?: number; current?: number; remaining?: number } => {
      // Not on trial → always allowed (paid plan limits enforced elsewhere)
      if (!isTrialing) return { allowed: true };

      const current = usage[key];
      const def = TRIAL_LIMITS[key];

      if (isTrialLimitReached(key, current)) {
        return {
          allowed: false,
          message: `You've reached the trial limit of ${def.limit} ${def.label.toLowerCase()}. Upgrade to continue.`,
          limit: def.limit,
          current,
          remaining: 0,
        };
      }

      return {
        allowed: true,
        limit: def.limit,
        current,
        remaining: getTrialRemaining(key, current),
      };
    },
    [isTrialing, usage],
  );

  return {
    isTrialing,
    usage,
    loading,
    canCreate,
    refresh: loadUsage,
  };
}
