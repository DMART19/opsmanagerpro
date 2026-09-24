/**
 * GlobalFrictionDetector — Passive, app-wide friction detection.
 *
 * Automatically detects:
 * - Rage clicks (3+ clicks on same element within 2s)
 * - Clicks on disabled buttons
 *
 * Renders nothing. Mount once in the app tree.
 */

import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { trackFriction } from "@/lib/track-friction";
import { useTourMode } from "@/contexts/TourModeContext";

const RAGE_CLICK_THRESHOLD = 3;
const RAGE_CLICK_WINDOW_MS = 2000;
// Don't log the same rage target more than once per 30s
const RAGE_COOLDOWN_MS = 30000;

export const GlobalFrictionDetector = () => {
  const location = useLocation();
  const { isTourMode } = useTourMode();
  const clickLog = useRef<{ target: string; timestamps: number[] }>({ target: "", timestamps: [] });
  const rageReported = useRef<Map<string, number>>(new Map());

  const handleClick = useCallback(
    (e: MouseEvent) => {
      // Skip in demo mode — no real user friction to track
      if (isTourMode) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      const pageRoute = location.pathname;

      // --- Disabled button clicks ---
      const button = target.closest("button, [role='button'], a") as HTMLElement | null;
      if (
        button &&
        (button.hasAttribute("disabled") || button.getAttribute("aria-disabled") === "true")
      ) {
        const label = getLabel(button);
        trackFriction("disabled_click", pageRoute, label);
        return;
      }

      // --- Rage click detection ---
      const label = getLabel(target);
      const now = Date.now();

      if (clickLog.current.target === label) {
        clickLog.current.timestamps.push(now);
        clickLog.current.timestamps = clickLog.current.timestamps.filter(
          (t) => now - t < RAGE_CLICK_WINDOW_MS
        );
      } else {
        clickLog.current = { target: label, timestamps: [now] };
      }

      if (clickLog.current.timestamps.length >= RAGE_CLICK_THRESHOLD) {
        const lastReported = rageReported.current.get(label) || 0;
        if (now - lastReported > RAGE_COOLDOWN_MS) {
          rageReported.current.set(label, now);
          trackFriction("rage_click", pageRoute, label, {
            clickCount: clickLog.current.timestamps.length,
          });
          clickLog.current = { target: "", timestamps: [] };
        }
      }
    },
    [isTourMode, location.pathname]
  );

  useEffect(() => {
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [handleClick]);

  // Reset cooldowns on route change
  useEffect(() => {
    rageReported.current.clear();
  }, [location.pathname]);

  return null;
};

function getLabel(el: HTMLElement): string {
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;
  const text = el.textContent?.trim().slice(0, 50);
  if (text) return text;
  return `${el.tagName.toLowerCase()}.${(el.className || "").toString().slice(0, 40)}`;
}
