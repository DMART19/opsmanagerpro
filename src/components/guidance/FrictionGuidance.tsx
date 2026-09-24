/**
 * FrictionGuidance — Appears when users repeatedly struggle with an action
 * 
 * Tracks repeated failures (validation errors, abandoned clicks) in sessionStorage.
 * Shows helpful guidance after a threshold is reached.
 */

import { useState, useEffect, useCallback } from "react";
import { useGuidance } from "@/hooks/use-guidance";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const FRICTION_PREFIX = "friction_";
const DEFAULT_THRESHOLD = 3;

interface FrictionGuidanceProps {
  /** Unique key for this friction point */
  frictionId: string;
  /** Guidance ID for persistence */
  guidanceId: string;
  /** Help message to show */
  message: string;
  /** Number of friction events before showing (default: 3) */
  threshold?: number;
  className?: string;
}

/**
 * Hook to track friction events and trigger guidance
 */
export function useFrictionTracker(frictionId: string, threshold = DEFAULT_THRESHOLD) {
  const key = `${FRICTION_PREFIX}${frictionId}`;

  const recordFriction = useCallback(() => {
    try {
      const current = parseInt(sessionStorage.getItem(key) || "0", 10);
      sessionStorage.setItem(key, String(current + 1));
    } catch {}
  }, [key]);

  const getFrictionCount = useCallback(() => {
    try {
      return parseInt(sessionStorage.getItem(key) || "0", 10);
    } catch {
      return 0;
    }
  }, [key]);

  const shouldShowGuidance = getFrictionCount() >= threshold;

  return { recordFriction, shouldShowGuidance, frictionCount: getFrictionCount() };
}

export const FrictionGuidance = ({
  frictionId,
  guidanceId,
  message,
  threshold = DEFAULT_THRESHOLD,
  className,
}: FrictionGuidanceProps) => {
  const { visible, markComplete } = useGuidance(guidanceId);
  const { shouldShowGuidance } = useFrictionTracker(frictionId, threshold);

  if (!visible || !shouldShowGuidance) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 px-3 py-2.5 rounded-lg",
        "bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40",
        "animate-in fade-in-0 slide-in-from-top-1 duration-300",
        className
      )}
    >
      <div className="flex-shrink-0 p-1 bg-amber-100 dark:bg-amber-900/40 rounded-md mt-0.5">
        <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
      </div>
      <p className="flex-1 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
        {message}
      </p>
      <button
        onClick={markComplete}
        className="flex-shrink-0 p-0.5 rounded hover:bg-amber-200/50 dark:hover:bg-amber-800/30 transition-colors mt-0.5"
        aria-label="Dismiss"
        type="button"
      >
        <X className="h-3 w-3 text-amber-600/60 dark:text-amber-400/60" />
      </button>
    </div>
  );
};
