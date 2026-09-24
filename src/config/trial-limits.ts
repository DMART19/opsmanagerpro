/**
 * Trial Limits — Centralized configuration for 14-day trial accounts.
 *
 * During the trial period, all features are unlocked but usage is capped.
 * Paid plans bypass these limits entirely.
 *
 * To adjust limits, edit the TRIAL_LIMITS object below.
 */

export type TrialLimitKey =
  | "assets"
  | "containers"
  | "palletBuilds"
  | "trailerBuilds"
  | "calendarEvents"
  | "teamMembers";

export interface TrialLimitDef {
  /** Maximum allowed during trial */
  limit: number;
  /** Human-readable label for UI messages */
  label: string;
  /** Singular noun for "You've reached the limit of 100 {noun}" */
  noun: string;
}

/**
 * Single source of truth for trial usage caps.
 * Paid plans ignore these entirely.
 */
export const TRIAL_LIMITS: Record<TrialLimitKey, TrialLimitDef> = {
  assets: {
    limit: 100,
    label: "Assets",
    noun: "asset",
  },
  containers: {
    limit: 25,
    label: "Containers",
    noun: "container",
  },
  palletBuilds: {
    limit: 20,
    label: "Pallet Builds",
    noun: "pallet build",
  },
  trailerBuilds: {
    limit: 10,
    label: "Trailer Builds",
    noun: "trailer build",
  },
  calendarEvents: {
    limit: 50,
    label: "Calendar Events",
    noun: "calendar event",
  },
  teamMembers: {
    limit: 3,
    label: "Team Members",
    noun: "team member",
  },
};

/**
 * Get the trial limit for a given resource type.
 */
export function getTrialLimit(key: TrialLimitKey): number {
  return TRIAL_LIMITS[key].limit;
}

/**
 * Check if a trial user has reached their limit.
 */
export function isTrialLimitReached(key: TrialLimitKey, currentCount: number): boolean {
  return currentCount >= TRIAL_LIMITS[key].limit;
}

/**
 * Get remaining count for a trial resource.
 */
export function getTrialRemaining(key: TrialLimitKey, currentCount: number): number {
  return Math.max(0, TRIAL_LIMITS[key].limit - currentCount);
}
