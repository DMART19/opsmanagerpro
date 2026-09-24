/**
 * Session Timeout Engine
 * ------------------------------------------------------------------
 * Tracks user activity to enforce:
 *  - idle timeout (sliding window) → IDLE_TIMEOUT_MINUTES
 *  - absolute session length       → ABSOLUTE_SESSION_HOURS
 *
 * On expiry we sign the user out and log a non-PII security event.
 * No timers run when the user is signed out.
 */

import {
  ABSOLUTE_SESSION_HOURS,
  ABSOLUTE_SESSION_START_KEY,
  IDLE_TIMEOUT_MINUTES,
  IDLE_WARNING_SECONDS,
} from "@/config/security";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent } from "@/lib/log-security-event";

export type TimeoutReason = "idle" | "absolute";

export interface TimeoutState {
  /** seconds until idle sign-out (≤ 0 means already timed out) */
  idleSecondsRemaining: number;
  /** seconds until absolute sign-out */
  absoluteSecondsRemaining: number;
  /** true once the warning threshold is crossed */
  warning: boolean;
}

function now() {
  return Date.now();
}

function readAbsoluteStart(): number {
  try {
    const raw = localStorage.getItem(ABSOLUTE_SESSION_START_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Ensure an absolute session start timestamp exists. */
export function ensureAbsoluteSessionStart(): number {
  let start = readAbsoluteStart();
  if (!start) {
    start = now();
    try {
      localStorage.setItem(ABSOLUTE_SESSION_START_KEY, String(start));
    } catch {
      /* ignore quota errors */
    }
  }
  return start;
}

/** Clear absolute session marker — called on sign-out. */
export function clearAbsoluteSessionStart() {
  try {
    localStorage.removeItem(ABSOLUTE_SESSION_START_KEY);
  } catch {
    /* ignore */
  }
}

export function computeTimeoutState(lastActivityAt: number): TimeoutState {
  const idleMs = IDLE_TIMEOUT_MINUTES * 60_000;
  const absMs = ABSOLUTE_SESSION_HOURS * 3_600_000;
  const start = ensureAbsoluteSessionStart();
  const t = now();

  const idleRemaining = Math.max(
    0,
    Math.floor((lastActivityAt + idleMs - t) / 1000),
  );
  const absoluteRemaining = Math.max(
    0,
    Math.floor((start + absMs - t) / 1000),
  );

  return {
    idleSecondsRemaining: idleRemaining,
    absoluteSecondsRemaining: absoluteRemaining,
    warning:
      idleRemaining > 0 &&
      idleRemaining <= IDLE_WARNING_SECONDS &&
      idleRemaining < absoluteRemaining,
  };
}

/**
 * Sign the user out and log a structured timeout event.
 * Never logs tokens or user-identifying details beyond user_id.
 */
export async function forceTimeoutSignOut(reason: TimeoutReason) {
  try {
    await logSecurityEvent({
      event_type:
        reason === "idle"
          ? "session_idle_timeout"
          : "session_absolute_timeout",
      severity: "low",
      details: {
        idle_minutes: IDLE_TIMEOUT_MINUTES,
        absolute_hours: ABSOLUTE_SESSION_HOURS,
      },
    });
  } catch {
    /* never block sign-out on logging failure */
  }
  clearAbsoluteSessionStart();
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }
  // Hard redirect so all in-memory caches reset and timers cancel.
  try {
    window.location.assign(`/auth?reason=${reason}_timeout`);
  } catch {
    /* SSR / test safety */
  }
}

/** Event names that count as "user activity" for sliding idle timeout. */
export const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
  "visibilitychange",
] as const;