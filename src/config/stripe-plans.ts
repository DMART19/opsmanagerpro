/**
 * Stripe Plan Configuration
 * Maps Stripe Price IDs to internal plan IDs.
 */

import type { PlanId } from "@/config/plans";

export interface StripePlanConfig {
  priceId: string;
  productId: string;
  planId: PlanId;
}

export const STRIPE_PLANS: Record<PlanId, StripePlanConfig> = {
  inventory: {
    priceId: "price_1UIrV6JkvedlgrWpPlDT28KQ",
    productId: "prod_TujJGVMfRZSjfn",
    planId: "inventory",
  },
  operations: {
    priceId: "price_1UIrVAJkvedlgrWp3Kgkz0oJ",
    productId: "prod_UKDtLyOn3zh9oQ",
    planId: "operations",
  },
  operations_pro: {
    priceId: "price_1UIrVEJkvedlgrWpkO41dh6v",
    productId: "prod_UKDvFzYE3utcPl",
    planId: "operations_pro",
  },
  enterprise: {
    // Enterprise is contact-sales; no self-serve Stripe price yet.
    priceId: "",
    productId: "",
    planId: "enterprise",
  },
};

/** Get the Stripe Price ID for a given internal plan */
export function getStripePriceId(planId: PlanId): string {
  return STRIPE_PLANS[planId].priceId;
}
