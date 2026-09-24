/**
 * PricingTable - Full pricing page component with 3-tier comparison
 * Driven by the canonical plan model in src/config/plans.ts
 * Matches OpsManagerPro Pricing PDF exactly
 */

import { useState } from "react";
import { Check, X, Star, ArrowRight, Loader2, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type PlanId, PLANS, PLAN_DISPLAY_NAMES } from "@/config/plans";
import { getStripePriceId } from "@/config/stripe-plans";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PricingTableProps {
  currentPlan?: PlanId;
  /** Plan the visitor chose before signing up — highlighted, never auto-purchased. */
  preselectedPlan?: PlanId | null;
}

// ---------------------------------------------------------------------------
// Feature matrix — exact copy of the PDF
// ---------------------------------------------------------------------------

interface FeatureRow {
  label: string;
  inventory: boolean | string;
  operations: boolean | string;
  operations_pro: boolean | string;
}

interface FeatureSection {
  title: string;
  rows: FeatureRow[];
}

const FEATURE_SECTIONS: FeatureSection[] = [
  {
    title: "Inventory Management",
    rows: [
      { label: "Asset & Container CRUD", inventory: true, operations: true, operations_pro: true },
      { label: "Barcode/QR Scanning", inventory: true, operations: true, operations_pro: true },
      { label: "Nested Container Hierarchy", inventory: true, operations: true, operations_pro: true },
      { label: "Custom Asset & Container Attributes", inventory: true, operations: true, operations_pro: true },
      { label: "Bulk Operations (Delete, Relocate)", inventory: true, operations: true, operations_pro: true },
      { label: "Expiration & Stock Alerts", inventory: true, operations: true, operations_pro: true },
      { label: "CSV Import/Export", inventory: true, operations: true, operations_pro: true },
      { label: "Inventory Print View", inventory: true, operations: true, operations_pro: true },
      { label: "Unified Asset Table & Inline Editing", inventory: true, operations: true, operations_pro: true },
      { label: "Activity History", inventory: true, operations: true, operations_pro: true },
    ],
  },
  {
    title: "Team Management & Compliance",
    rows: [
      { label: "Team Directory & Member Profiles", inventory: false, operations: true, operations_pro: true },
      { label: "Roles, Departments, Statuses", inventory: false, operations: true, operations_pro: true },
      { label: "Credential Definitions & Assignment", inventory: false, operations: true, operations_pro: true },
      { label: "Compliance Matrix & Momentum View", inventory: false, operations: true, operations_pro: true },
      { label: "Credential Expiration Alerts", inventory: false, operations: true, operations_pro: true },
      { label: "Compliance Filters & Metrics", inventory: false, operations: true, operations_pro: true },
    ],
  },
  {
    title: "Scheduling & Recurring Work",
    rows: [
      { label: "Add/View Tasks", inventory: false, operations: true, operations_pro: true },
      { label: "Calendar Views (Day/Week/Month)", inventory: false, operations: true, operations_pro: true },
      { label: "Recurring Tasks & Inspections", inventory: false, operations: true, operations_pro: true },
      { label: "Expiring Items Panel", inventory: false, operations: true, operations_pro: true },
    ],
  },
  {
    title: "3D Planning & Logistics (Flagship)",
    rows: [
      { label: "Interactive 3D Pallet Builder", inventory: false, operations: false, operations_pro: true },
      { label: "Interactive 3D Trailer Builder", inventory: false, operations: false, operations_pro: true },
      { label: "AI Load Plan (Excel → Loads)", inventory: false, operations: false, operations_pro: true },
      { label: "Weight Distribution Safeguards", inventory: false, operations: false, operations_pro: true },
      { label: "Save/Load/Export Layouts", inventory: false, operations: false, operations_pro: true },
    ],
  },
  {
    title: "Reports & Analytics",
    rows: [
      { label: "Live KPI Dashboard", inventory: true, operations: true, operations_pro: true },
      { label: "Compliance & Needs Attention Panels", inventory: false, operations: true, operations_pro: true },
      { label: "Workspace Insights", inventory: false, operations: false, operations_pro: true },
    ],
  },
  {
    title: "Scale & Governance",
    rows: [
      { label: "Warehouse Locations", inventory: "1", operations: "2", operations_pro: "5" },
    ],
  },
];

type PublicTier = "inventory" | "operations" | "operations_pro";

const TIER_IDS: PublicTier[] = ["inventory", "operations", "operations_pro"];

const TIER_TAGLINES: Record<PublicTier, string> = {
  inventory: "For small teams replacing spreadsheets.",
  operations: "For teams managing people and daily work.",
  operations_pro: "The 3D flagship — plan every pallet and trailer before it moves.",
};

const TIER_CALLOUTS: Record<PublicTier, string[]> = {
  inventory: ["Inventory", "Barcode", "KPI Dashboard"],
  operations: ["Team", "Compliance", "Scheduling"],
  operations_pro: ["3D Pallets", "3D Trailers", "AI Load Plan"],
};

// ---------------------------------------------------------------------------
// Cell renderer
// ---------------------------------------------------------------------------

function AccessCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <div className="flex items-center justify-center">
        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
          <Check className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
    );
  }
  if (typeof value === "string") {
    return (
      <span className="text-xs font-medium text-warning whitespace-nowrap">{value}</span>
    );
  }
  return (
    <div className="flex items-center justify-center">
      <X className="h-3.5 w-3.5 text-muted-foreground/30" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PricingTable = ({ currentPlan, preselectedPlan }: PricingTableProps) => {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === currentPlan) return;
    setLoadingPlan(planId);
    try {
      const priceId = getStripePriceId(planId);
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err: any) {
      console.error("Portal error:", err);
      toast.error("Failed to open subscription management. Please try again.");
    }
  };

  return (
    <div className="space-y-10">
      {/* ── Plan Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TIER_IDS.map((tierId) => {
          const plan = PLANS[tierId];
          const isPopular = tierId === "operations_pro";
          const isCurrent = currentPlan === tierId;
          const isPreselected = !isCurrent && preselectedPlan === tierId;

          return (
            <Card
              key={tierId}
              className={cn(
                "relative flex flex-col p-6 transition-all",
                isPopular && "border-primary shadow-lg shadow-primary/10 xl:scale-105 z-10",
                isCurrent && !isPopular && "border-primary/40 bg-primary/5",
                isPreselected && "ring-2 ring-primary/60"
              )}
            >
              {/* Popular badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-sm gap-1.5 px-3.5 py-1 text-xs font-semibold">
                    <Star className="h-3 w-3" />
                    FLAGSHIP · 3D + AI
                  </Badge>
                </div>
              )}

              {isPreselected && (
                <p className="absolute top-2 right-3 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Your pick
                </p>
              )}

              {/* Plan name + tagline */}
              <div className="mb-5 pt-1">
                <h3 className="text-xl font-bold text-foreground">
                  {PLAN_DISPLAY_NAMES[tierId]}
                </h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  {TIER_TAGLINES[tierId]}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {TIER_CALLOUTS[tierId].map((c) => (
                    <span
                      key={c}
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border",
                        isPopular
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 bg-muted/40 text-muted-foreground"
                      )}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-foreground">
                    ${plan.monthly_price}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">/month</span>
                </div>
              </div>

              {/* Limits */}
              <div className="bg-muted/50 rounded-xl p-4 mb-5 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Users included</span>
                  <span className="font-semibold text-foreground">
                    {`Up to ${plan.max_users}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Asset limit</span>
                  <span className="font-semibold text-foreground">
                    {plan.asset_limit.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Warehouse locations</span>
                  <span className="font-semibold text-foreground">
                    {plan.warehouse_location_limit}
                  </span>
                </div>
              </div>

              {/* Quick feature highlights */}
              <ul className="space-y-2.5 mb-6 flex-1">
                {getQuickFeatures(tierId).map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                className={cn(
                  "w-full gap-2 h-11 text-sm font-semibold",
                  isPopular
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                    : ""
                )}
                variant={isPopular ? "default" : "outline"}
                onClick={() => handleSelectPlan(tierId)}
                disabled={isCurrent || loadingPlan === tierId}
              >
                {loadingPlan === tierId ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                ) : isCurrent ? (
                  "Current Plan"
                ) : (
                  <>{`Start ${PLAN_DISPLAY_NAMES[tierId]}`}<ArrowRight className="h-4 w-4" /></>
                )}
              </Button>

              {isCurrent && (
                <div className="space-y-2 mt-2">
                  <p className="text-xs text-center text-muted-foreground">
                    You're on this plan
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs gap-1.5"
                    onClick={handleManageSubscription}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Manage Subscription
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── Feature Comparison Table ──────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Feature Comparison</h2>
        <p className="text-sm text-muted-foreground mb-6">
          See exactly what's included in each plan.
        </p>

        <div className="border border-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_90px_90px_90px] sm:grid-cols-[1fr_110px_110px_110px] bg-muted/50 border-b border-border">
            <div className="px-4 py-3 text-sm font-semibold text-foreground">Feature</div>
            {TIER_IDS.map((id) => (
              <div
                key={id}
                className={cn(
                  "px-2 py-3 text-center text-xs font-semibold",
                  id === "operations_pro" ? "text-primary" : "text-foreground"
                )}
              >
                {PLAN_DISPLAY_NAMES[id]}
              </div>
            ))}
          </div>

          {/* Sections */}
          {FEATURE_SECTIONS.map((section, sIdx) => (
            <div key={section.title}>
              {/* Section header */}
              <div className="grid grid-cols-[1fr_90px_90px_90px] sm:grid-cols-[1fr_110px_110px_110px] bg-muted/30 border-b border-border">
                <div className="px-4 py-2.5 text-xs font-bold text-foreground uppercase tracking-wider">
                  {section.title}
                </div>
                <div /><div /><div />
              </div>

              {/* Rows */}
              {section.rows.map((row, rIdx) => (
                <div
                  key={row.label}
                  className={cn(
                    "grid grid-cols-[1fr_90px_90px_90px] sm:grid-cols-[1fr_110px_110px_110px] border-b border-border/50",
                    rIdx % 2 === 0 ? "bg-background" : "bg-muted/10"
                  )}
                >
                  <div className="px-4 py-2.5 text-sm text-foreground">{row.label}</div>
                  <div className="flex items-center justify-center px-2 py-2.5">
                    <AccessCell value={row.inventory} />
                  </div>
                  <div className="flex items-center justify-center px-2 py-2.5">
                    <AccessCell value={row.operations} />
                  </div>
                  <div className="flex items-center justify-center px-2 py-2.5">
                    <AccessCell value={row.operations_pro} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────── */}
      <div className="text-center space-y-3 py-4">
        <p className="text-sm text-muted-foreground">
          Questions about pricing?{" "}
          <a href="mailto:support@opsmanagerpro.com" className="underline text-primary hover:text-primary/80">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Quick feature highlights per tier (shown on cards)
// ---------------------------------------------------------------------------

function getQuickFeatures(planId: PlanId): string[] {
  switch (planId) {
    case "inventory":
      return [
        "Know exactly what's in stock, in real time",
        "Scan items in and out from any phone",
        "Move data in and out with CSV",
        "See inventory KPIs at a glance",
      ];
    case "operations":
      return [
        "Everything in Inventory",
        "Keep every credential current",
        "Assign roles, tasks, and recurring inspections",
        "Full calendar with day/week/month views",
      ];
    case "operations_pro":
      return [
        "Everything in Operations",
        "Interactive 3D Pallet Builder",
        "Interactive 3D Trailer Builder",
        "AI Load Plan from a spreadsheet",
        "Prevent overloaded trailers",
      ];
    case "enterprise":
      return [];
  }
}
