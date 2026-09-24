/**
 * Canonical plan allowances for edge functions.
 *
 * This mirrors src/config/plans.ts and public.plan_limits() in the database.
 * The database is the enforcement point; these values exist so that records
 * written by webhooks stay consistent with it.
 *
 * Official plans:
 *   Starter (inventory)         $49/month   — 3 users,  500 items,  1 location
 *   Operations (operations)     $119/month  — 10 users, 2,500 items, 2 locations
 *   Logistics Pro (operations_pro) $249/month — 30 users, 10,000 items, 5 locations
 *   Enterprise (enterprise)     Custom      — custom limits
 */

export type PlanTier = "inventory" | "operations" | "operations_pro" | "enterprise";

export interface PlanAllowance {
  maxTeamMembers: number;
  maxAssets: number;
  maxLocations: number;
}

export const PLAN_ALLOWANCES: Record<PlanTier, PlanAllowance> = {
  inventory: { maxTeamMembers: 3, maxAssets: 500, maxLocations: 1 },
  operations: { maxTeamMembers: 10, maxAssets: 2_500, maxLocations: 2 },
  operations_pro: { maxTeamMembers: 30, maxAssets: 10_000, maxLocations: 5 },
  // Enterprise is negotiated per contract; these are the defaults applied
  // until a custom allowance is set on the workspace plan record.
  enterprise: { maxTeamMembers: 999_999, maxAssets: 999_999, maxLocations: 999_999 },
};

export const PLAN_MONTHLY_PRICE: Record<PlanTier, number | "custom"> = {
  inventory: 49,
  operations: 119,
  operations_pro: 249,
  enterprise: "custom",
};
