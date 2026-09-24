/**
 * useGuidance — Server-persisted guidance system
 * 
 * Syncs guidance progress to user_guidance_progress table.
 * Falls back to localStorage for unauthenticated / demo users.
 * Shows each guidance_id exactly once per user.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const LOCAL_PREFIX = "omp_guidance_";

export function useGuidance(guidanceId: string) {
  const [completed, setCompleted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`${LOCAL_PREFIX}${guidanceId}`) === "1";
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(true);
  const syncedRef = useRef(false);

  // Sync with server on mount
  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;

    const sync = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from("user_guidance_progress")
          .select("completed")
          .eq("user_id", user.id)
          .eq("guidance_id", guidanceId)
          .maybeSingle();

        if (data?.completed) {
          setCompleted(true);
          try { localStorage.setItem(`${LOCAL_PREFIX}${guidanceId}`, "1"); } catch {}
        }
      } catch {
        // Silently fail — localStorage fallback is fine
      } finally {
        setLoading(false);
      }
    };

    sync();
  }, [guidanceId]);

  const markComplete = useCallback(async () => {
    setCompleted(true);
    try { localStorage.setItem(`${LOCAL_PREFIX}${guidanceId}`, "1"); } catch {}

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("user_guidance_progress")
        .upsert(
          {
            user_id: user.id,
            guidance_id: guidanceId,
            seen: true,
            completed: true,
            route: typeof window !== "undefined" ? window.location.pathname : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,guidance_id" }
        );
    } catch {
      // Non-critical
    }
  }, [guidanceId]);

  const markSeen = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("user_guidance_progress")
        .upsert(
          {
            user_id: user.id,
            guidance_id: guidanceId,
            seen: true,
            completed: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,guidance_id" }
        );
    } catch {
      // Non-critical
    }
  }, [guidanceId]);

  return {
    /** Whether this guidance has been completed (should NOT show) */
    completed,
    /** Whether we're still loading from server */
    loading,
    /** True when guidance should be visible */
    visible: !completed && !loading,
    /** Mark guidance as completed — never shows again */
    markComplete,
    /** Mark guidance as seen (but not completed) */
    markSeen,
  };
}
