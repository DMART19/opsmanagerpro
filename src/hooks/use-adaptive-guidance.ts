/**
 * useAdaptiveGuidance — Adaptive UI guidance driven by requirementEngine
 *
 * Manages guidance levels (strong/soft/off), cooldowns, dynamic priority boosts,
 * and auto-suppression based on user behavior.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRequirementEngine, Requirement, REQUIREMENT_ENGINE_KEY } from "./use-requirement-engine";
import { useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────

export type GuidanceLevel = "strong" | "soft" | "off";

export interface GuidanceState {
  /** Current active requirement (only ONE at a time) */
  activeRequirement: Requirement | null;
  /** Current guidance intensity */
  level: GuidanceLevel;
  /** The resolve key of the element to highlight */
  targetResolveKey: string | null;
  /** Whether the system is fully complete */
  systemComplete: boolean;
  /** Whether a specific group is complete */
  isGroupComplete: (group: string) => boolean;
  /** Whether we're in onboarding mode (any requirement active) */
  isOnboarding: boolean;
  /** Signal that user interacted with the target element */
  recordInteraction: (resolveKey: string) => void;
  /** Signal that user ignored guidance (clicked elsewhere) */
  recordIgnore: () => void;
  /** Signal that user completed a requirement successfully */
  recordCompletion: (requirementId: string) => void;
  /** Signal that a requirement action failed */
  recordFailure: (requirementId: string) => void;
  /** Refresh engine state from DB */
  refresh: () => void;
  /** Loading state */
  loading: boolean;
  /** Completion progress */
  completedCount: number;
  totalRequired: number;
}

// ─── Constants ────────────────────────────────────────────────────

const COOLDOWN_MS = 60_000; // 1 minute cooldown after 3 ignores
const IGNORE_THRESHOLD = 3;
const STORAGE_KEY = "omp_guidance_state";

interface PersistedState {
  ignoreCounts: Record<string, number>;
  cooldowns: Record<string, number>; // timestamp when cooldown expires
  completions: number; // total successful completions
}

function loadPersistedState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { ignoreCounts: {}, cooldowns: {}, completions: 0 };
}

function savePersistedState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ─── Hook ─────────────────────────────────────────────────────────

export function useAdaptiveGuidance(): GuidanceState {
  const engine = useRequirementEngine();
  const queryClient = useQueryClient();
  const [persisted, setPersisted] = useState<PersistedState>(loadPersistedState);
  const [level, setLevel] = useState<GuidanceLevel>("strong");
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Persist state changes
  useEffect(() => {
    savePersistedState(persisted);
  }, [persisted]);

  // Determine active requirement, respecting cooldowns
  const activeRequirement = useMemo(() => {
    if (engine.allRequiredComplete) return null;

    const now = Date.now();
    // Check if nextRequirement is in cooldown
    const next = engine.nextRequirement;
    if (!next) return null;

    const cooldownExpiry = persisted.cooldowns[next.id] || 0;
    if (cooldownExpiry > now) {
      // Next requirement is in cooldown — try to find another
      // Use nextRequirementForGroup to find alternatives
      for (const group of ["assets", "calendar", "team"]) {
        const alt = engine.nextRequirementForGroup(group);
        if (alt && (!persisted.cooldowns[alt.id] || persisted.cooldowns[alt.id] <= now)) {
          return alt;
        }
      }
      return null; // all in cooldown
    }

    return next;
  }, [engine.nextRequirement, engine.allRequiredComplete, engine.nextRequirementForGroup, persisted.cooldowns]);

  // Auto-suppress: reduce level after repeated completions
  useEffect(() => {
    if (persisted.completions >= 3) {
      setLevel("soft");
    }
    if (engine.allRequiredComplete) {
      setLevel("off");
    }
  }, [persisted.completions, engine.allRequiredComplete]);

  const targetResolveKey = activeRequirement?.resolve ?? null;

  const recordInteraction = useCallback((resolveKey: string) => {
    if (resolveKey === targetResolveKey) {
      // User is following guidance — keep strong
      setLevel("strong");
      // Reset ignore count for active requirement
      if (activeRequirement) {
        setPersisted(prev => ({
          ...prev,
          ignoreCounts: { ...prev.ignoreCounts, [activeRequirement.id]: 0 },
        }));
      }
    }
  }, [targetResolveKey, activeRequirement]);

  const recordIgnore = useCallback(() => {
    if (!activeRequirement) return;

    setPersisted(prev => {
      const newCount = (prev.ignoreCounts[activeRequirement.id] || 0) + 1;
      const newState = {
        ...prev,
        ignoreCounts: { ...prev.ignoreCounts, [activeRequirement.id]: newCount },
      };

      if (newCount >= IGNORE_THRESHOLD) {
        // Apply cooldown
        newState.cooldowns = {
          ...prev.cooldowns,
          [activeRequirement.id]: Date.now() + COOLDOWN_MS,
        };
        newState.ignoreCounts[activeRequirement.id] = 0;
      }

      return newState;
    });

    // Downgrade to soft after any ignore
    setLevel("soft");

    // Reset back to strong after a delay if user comes back
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    interactionTimeoutRef.current = setTimeout(() => {
      setLevel(prev => prev === "soft" ? "strong" : prev);
    }, 15_000);
  }, [activeRequirement]);

  const recordCompletion = useCallback((requirementId: string) => {
    engine.logAudit(requirementId, "completed");
    setPersisted(prev => ({
      ...prev,
      completions: prev.completions + 1,
      ignoreCounts: { ...prev.ignoreCounts, [requirementId]: 0 },
    }));
    // Refresh engine state from DB
    engine.refresh();
  }, [engine]);

  const recordFailure = useCallback((requirementId: string) => {
    engine.logAudit(requirementId, "failed");
    // Don't mark complete, keep guidance active
  }, [engine]);

  const isGroupComplete = useCallback((group: string) => {
    return engine.groupComplete(group);
  }, [engine]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    };
  }, []);

  return {
    activeRequirement,
    level,
    targetResolveKey,
    systemComplete: engine.allRequiredComplete,
    isGroupComplete,
    isOnboarding: !engine.allRequiredComplete && activeRequirement !== null,
    recordInteraction,
    recordIgnore,
    recordCompletion,
    recordFailure,
    refresh: engine.refresh,
    loading: engine.loading,
    completedCount: engine.completedCount,
    totalRequired: engine.totalRequired,
  };
}
