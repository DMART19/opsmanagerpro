/**
 * useActionMilestone — Auto-dismiss guidance when a user completes an action
 * 
 * Tracks milestone completion in localStorage and can auto-dismiss
 * related guidance IDs when the milestone is reached.
 */

import { useCallback, useEffect, useRef } from "react";
import { useGuidance } from "@/hooks/use-guidance";

const MILESTONE_PREFIX = "omp_milestone_";

export function useActionMilestone(milestoneKey: string, relatedGuidanceIds: string[] = []) {
  const isComplete = useRef(() => {
    try {
      return localStorage.getItem(`${MILESTONE_PREFIX}${milestoneKey}`) === "1";
    } catch {
      return false;
    }
  });

  const guidanceHooks = relatedGuidanceIds.map(id => {
    // We can't call hooks in a loop normally, but since relatedGuidanceIds
    // is expected to be stable, this is safe in practice.
    // For safety, we'll handle this differently — just mark localStorage directly.
    return id;
  });

  const markMilestoneComplete = useCallback(() => {
    try {
      localStorage.setItem(`${MILESTONE_PREFIX}${milestoneKey}`, "1");
    } catch {}

    // Auto-dismiss related guidance
    relatedGuidanceIds.forEach(id => {
      try {
        localStorage.setItem(`omp_guidance_${id}`, "1");
      } catch {}
    });
  }, [milestoneKey, relatedGuidanceIds]);

  const isMilestoneComplete = useCallback(() => {
    try {
      return localStorage.getItem(`${MILESTONE_PREFIX}${milestoneKey}`) === "1";
    } catch {
      return false;
    }
  }, [milestoneKey]);

  return { markMilestoneComplete, isMilestoneComplete };
}

/**
 * useIdleGuidance — Shows guidance after user idles on a page
 * 
 * Triggers a callback after a specified idle duration.
 * Only fires once per session per key.
 */
export function useIdleGuidance(key: string, idleMs: number = 5000) {
  const firedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const startIdle = useCallback((onIdle: () => void) => {
    if (firedRef.current) return;
    
    // Check if already seen
    const sessionKey = `idle_guidance_${key}`;
    try {
      if (sessionStorage.getItem(sessionKey)) return;
    } catch {}

    timerRef.current = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        try { sessionStorage.setItem(sessionKey, "1"); } catch {}
        onIdle();
      }
    }, idleMs);
  }, [key, idleMs]);

  const cancelIdle = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { startIdle, cancelIdle };
}
