/**
 * Pending plan selection — carries a plan choice made before signup
 * through account creation, email verification, and into the existing
 * billing / checkout flow.
 *
 * Uses the canonical internal plan identifiers from src/config/plans.ts.
 * Never activates a trial or a subscription on its own — it only remembers
 * which plan the visitor clicked.
 */

import type { PlanId } from "@/config/plans";

/** Plans that can be selected by a new customer (Enterprise is not public). */
export const PUBLIC_PLAN_IDS = ["inventory", "operations", "operations_pro"] as const;
export type PublicPlanId = (typeof PUBLIC_PLAN_IDS)[number];

const STORAGE_KEY = "omp.pending_plan";
const TTL_MS = 24 * 60 * 60 * 1000; // selection is only meaningful for a day

export function isPublicPlanId(value: unknown): value is PublicPlanId {
  return typeof value === "string" && (PUBLIC_PLAN_IDS as readonly string[]).includes(value);
}

/** Coerce an arbitrary query value to a valid public plan id, or null. */
export function parsePlanId(value: string | null | undefined): PublicPlanId | null {
  return isPublicPlanId(value) ? value : null;
}

export function setPendingPlan(planId: PublicPlanId) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ planId, ts: Date.now() }));
  } catch {
    // Storage unavailable (private mode) — selection simply won't persist.
  }
}

export function getPendingPlan(): PublicPlanId | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { planId?: unknown; ts?: unknown };
    if (typeof parsed.ts === "number" && Date.now() - parsed.ts > TTL_MS) {
      clearPendingPlan();
      return null;
    }
    return isPublicPlanId(parsed.planId) ? parsed.planId : null;
  } catch {
    return null;
  }
}

export function clearPendingPlan() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}

/** Read once and remove. */
export function consumePendingPlan(): PublicPlanId | null {
  const planId = getPendingPlan();
  if (planId) clearPendingPlan();
  return planId;
}

/**
 * Where a freshly authenticated user should land, given a remembered plan.
 * Falls back to the caller's default when nothing was selected.
 */
export function planAwareRedirect(defaultPath: string): string {
  const planId = consumePendingPlan();
  return planId ? `/billing?plan=${planId}` : defaultPath;
}

/**
 * Only allow same-origin, path-relative redirects.
 * Rejects absolute URLs, protocol-relative "//evil.com", and backslash tricks.
 */
export function safeInternalPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (raw.includes("\\")) return null;
  return raw;
}

/** Build the signup URL, optionally preserving the selected plan and a next path. */
export function signupUrl(planId?: PlanId | null, next?: string | null): string {
  const params = new URLSearchParams({ mode: "signup" });
  if (isPublicPlanId(planId)) params.set("plan", planId);
  const safeNext = safeInternalPath(next);
  if (safeNext) params.set("next", safeNext);
  return `/auth?${params.toString()}`;
}
