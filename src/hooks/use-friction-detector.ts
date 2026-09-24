/**
 * useFrictionDetector — Passive friction detection hook.
 *
 * Auto-detects:
 * - Rage clicks (3+ clicks on same element within 2s)
 * - Clicks on disabled buttons
 * - Form abandonment (dirty form + navigation away)
 *
 * Usage:
 *   const { ref } = useFrictionDetector("/inventory");
 *   return <div ref={ref}>...</div>;
 */

import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { trackFriction } from "@/lib/track-friction";

const RAGE_CLICK_THRESHOLD = 3;
const RAGE_CLICK_WINDOW_MS = 2000;

interface ClickRecord {
  target: string;
  timestamps: number[];
}

/**
 * Returns a ref to attach to a container element for passive friction monitoring.
 */
export const useFrictionDetector = (pageRouteOverride?: string) => {
  const location = useLocation();
  const pageRoute = pageRouteOverride || location.pathname;
  const containerRef = useRef<HTMLDivElement>(null);
  const clickLog = useRef<ClickRecord>({ target: "", timestamps: [] });
  const reportedRageTargets = useRef<Set<string>>(new Set());

  // --- Rage Click Detection ---
  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const label = getElementLabel(target);

      // --- Disabled button clicks ---
      const button = target.closest("button, [role='button']") as HTMLElement | null;
      if (button && (button.hasAttribute("disabled") || button.getAttribute("aria-disabled") === "true")) {
        trackFriction("disabled_click", pageRoute, label, {
          tagName: button.tagName,
          classes: button.className?.slice(0, 120),
        });
        return; // Don't also count as rage click
      }

      // --- Rage click tracking ---
      const now = Date.now();
      if (clickLog.current.target === label) {
        clickLog.current.timestamps.push(now);
        // Prune old timestamps
        clickLog.current.timestamps = clickLog.current.timestamps.filter(
          (t) => now - t < RAGE_CLICK_WINDOW_MS
        );
      } else {
        clickLog.current = { target: label, timestamps: [now] };
      }

      if (
        clickLog.current.timestamps.length >= RAGE_CLICK_THRESHOLD &&
        !reportedRageTargets.current.has(label)
      ) {
        reportedRageTargets.current.add(label);
        trackFriction("rage_click", pageRoute, label, {
          clickCount: clickLog.current.timestamps.length,
        });
        // Reset so we don't fire repeatedly
        clickLog.current = { target: "", timestamps: [] };
      }
    },
    [pageRoute]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("click", handleClick, true);
    return () => el.removeEventListener("click", handleClick, true);
  }, [handleClick]);

  // Reset rage targets on route change
  useEffect(() => {
    reportedRageTargets.current.clear();
  }, [location.pathname]);

  return { ref: containerRef };
};

/**
 * Hook to track form abandonment.
 * Call `markDirty()` when the form has unsaved changes.
 * Automatically tracks abandonment on unmount if dirty and not submitted.
 */
export const useFormAbandonmentTracker = (formName: string, pageRoute?: string) => {
  const location = useLocation();
  const route = pageRoute || location.pathname;
  const isDirty = useRef(false);
  const wasSubmitted = useRef(false);

  const markDirty = useCallback(() => {
    isDirty.current = true;
  }, []);

  const markSubmitted = useCallback(() => {
    wasSubmitted.current = true;
  }, []);

  const reset = useCallback(() => {
    isDirty.current = false;
    wasSubmitted.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (isDirty.current && !wasSubmitted.current) {
        trackFriction("abandoned_workflow", route, formName, {
          form: formName,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { markDirty, markSubmitted, reset };
};

// --- Helpers ---

function getElementLabel(el: HTMLElement): string {
  // Try aria-label first
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;

  // Try innerText (truncated)
  const text = el.textContent?.trim().slice(0, 60);
  if (text) return text;

  // Fallback to tag + class
  return `${el.tagName.toLowerCase()}.${el.className?.toString().slice(0, 40) || "no-class"}`;
}
