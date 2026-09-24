import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Minus, Sparkles } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { Link } from "react-router-dom";
import type { PublicPlanId } from "@/lib/pending-plan";

interface PricingSectionProps {
  onGetStarted: () => void;
  /** Opens signup with this plan preserved. Falls back to onGetStarted. */
  onSelectPlan?: (planId: PublicPlanId) => void;
  /** Show the full feature comparison table (pricing details page). */
  showComparison?: boolean;
}

type PlanCard = {
  id: PublicPlanId;
  name: string;
  tagline: string;
  price: number;
  users: string;
  items: string;
  description: string;
  subtitle?: string;
  callouts: string[];
  cta: string;
  popular?: boolean;
  features: string[];
};

const plans: PlanCard[] = [
  {
    id: "inventory",
    name: "Starter",
    tagline: "Inventory tracking for small teams.",
    price: 49,
    users: "Up to 3",
    items: "500",
    description: "Replace your spreadsheets.",
    callouts: ["Inventory", "Barcode", "Dashboard"],
    cta: "Start Starter",
    features: [
      "Track stock in real time",
      "Scan items from any phone",
      "Import and export with CSV",
      "See inventory KPIs at a glance",
    ],
  },
  {
    id: "operations",
    name: "Operations",
    tagline: "Inventory plus team, compliance, and scheduling.",
    price: 119,
    users: "Up to 10",
    items: "2,500",
    description: "Manage people and daily work.",
    callouts: ["Team", "Compliance", "Scheduling"],
    cta: "Start Operations",
    features: [
      "Everything in Starter",
      "Keep credentials current — no expired paperwork",
      "Assign tasks and recurring inspections",
      "Full calendar: day, week, month",
      "Alerts before compliance lapses",
    ],
  },
  {
    id: "operations_pro",
    name: "Logistics Pro",
    tagline: "Everything, plus 3D load planning and AI.",
    price: 249,
    users: "Up to 30",
    items: "10,000",
    description: "For teams shipping optimized loads.",
    subtitle: "Plan every pallet and trailer before it ships.",
    callouts: ["3D Pallets", "3D Trailers", "AI Load Plan"],
    cta: "Start Logistics Pro",
    popular: true,
    features: [
      "Everything in Operations",
      "3D Pallet Builder — stack tight, load faster",
      "3D Trailer Builder — pack every cube",
      "AI load plans from a spreadsheet",
      "Catch overloaded trailers early",
      "Save, reuse, and export layouts",
    ],
  },
];

type Access = true | false | string;

interface ComparisonRow {
  label: string;
  inventory: Access;
  operations: Access;
  operations_pro: Access;
}

const comparisonSections: { title: string; rows: ComparisonRow[] }[] = [
  {
    title: "Inventory Management",
    rows: [
      { label: "Item & container tracking", inventory: true, operations: true, operations_pro: true },
      { label: "Barcode / QR Scanning", inventory: true, operations: true, operations_pro: true },
      { label: "Nested Container Hierarchy", inventory: true, operations: true, operations_pro: true },
      { label: "Custom Attributes", inventory: true, operations: true, operations_pro: true },
      { label: "Bulk Operations", inventory: true, operations: true, operations_pro: true },
      { label: "Expiration & Stock Alerts", inventory: true, operations: true, operations_pro: true },
      { label: "CSV Import / Export", inventory: true, operations: true, operations_pro: true },
      { label: "Inventory Print View", inventory: true, operations: true, operations_pro: true },
      { label: "Unified item table & inline editing", inventory: true, operations: true, operations_pro: true },
      { label: "Activity History", inventory: true, operations: true, operations_pro: true },
    ],
  },
  {
    title: "Team Management & Compliance",
    rows: [
      { label: "Team directory & profiles", inventory: false, operations: true, operations_pro: true },
      { label: "Roles, departments, statuses", inventory: false, operations: true, operations_pro: true },
      { label: "Credential assignment", inventory: false, operations: true, operations_pro: true },
      { label: "Compliance view", inventory: false, operations: true, operations_pro: true },
      { label: "Credential Expiration Alerts", inventory: false, operations: true, operations_pro: true },
      { label: "Compliance filters & metrics", inventory: false, operations: true, operations_pro: true },
    ],
  },
  {
    title: "Scheduling & Recurring Work",
    rows: [
      { label: "Add / View Tasks", inventory: false, operations: true, operations_pro: true },
      { label: "Full Calendar (Day/Week/Month)", inventory: false, operations: true, operations_pro: true },
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
      { label: "Prevent overloaded trailers", inventory: false, operations: false, operations_pro: true },
      { label: "Save / reuse / export layouts", inventory: false, operations: false, operations_pro: true },
    ],
  },
  {
    title: "Reports & Analytics",
    rows: [
      { label: "Live KPI dashboard", inventory: true, operations: true, operations_pro: true },
      { label: "Needs attention panels", inventory: false, operations: true, operations_pro: true },
      { label: "Workspace insights & analytics", inventory: false, operations: false, operations_pro: true },
    ],
  },
  {
    title: "Scale & Governance",
    rows: [
      { label: "Users included", inventory: "3", operations: "10", operations_pro: "30" },
      { label: "Warehouse locations", inventory: "1", operations: "2", operations_pro: "5" },
    ],
  },
];

const AccessCell = ({ value }: { value: Access }) => {
  if (value === true)
    return <Check className="h-4 w-4 text-primary mx-auto" />;
  if (value === false)
    return <Minus className="h-4 w-4 text-muted-foreground/30 mx-auto" />;
  return (
    <span className="text-xs text-muted-foreground font-medium">{value}</span>
  );
};

export const PricingSection = ({ onGetStarted, onSelectPlan, showComparison = true }: PricingSectionProps) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.05 });

  return (
    <section id="pricing" className="py-24 sm:py-32 px-[2px] relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid-soft opacity-40" style={{ maskImage: "radial-gradient(ellipse 60% 50% at 50% 50%, black, transparent)", WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 50%, black, transparent)" }} />
        <div className="aurora-orb aurora-orb-primary w-[500px] h-[500px] top-0 left-1/2 -translate-x-1/2 opacity-25" />
      </div>
      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-14">
          <h2
            className={`text-[1.75rem] sm:text-[2rem] font-semibold mb-4 text-foreground transition-all duration-700 ease-apple ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Simple pricing
          </h2>
          <p
            className={`text-muted-foreground text-[1rem] sm:text-[1.0625rem] leading-relaxed transition-all duration-700 ease-apple ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            Start with inventory. Add your team. Plan every load in 3D.
          </p>
          <p
            className={`text-sm sm:text-base text-foreground/80 mt-4 transition-all duration-700 ease-apple ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "150ms" }}
          >
            Free for 14 days · No credit card
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid gap-6 mb-10 md:grid-cols-3">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
                className={`rounded-2xl ${
                plan.popular
                    ? "glow-border glass-card shadow-[0_30px_70px_-30px_hsl(var(--primary)/0.5)] scale-[1.02]"
                    : "card-glow glass-card border border-border/40"
                } p-7 text-left relative transition-all duration-500 ease-apple ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: isVisible ? `${200 + index * 80}ms` : "0ms" }}
            >
              {plan.popular && (
                <div className="absolute -top-3 right-4">
                    <span className="bg-gradient-to-r from-primary to-[hsl(280,90%,60%)] text-primary-foreground text-[11px] font-semibold px-3 py-1 rounded-full shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.7)]">
                    ⭐ Flagship — 3D + AI
                  </span>
                </div>
              )}

              <h3 className="font-semibold text-lg text-foreground mb-1">{plan.name}</h3>
              <p className="text-sm text-foreground/80 mb-2 leading-snug">{plan.tagline}</p>
              {plan.subtitle && (
                <p className="text-[12px] text-primary/90 font-medium mb-2 leading-snug">
                  {plan.subtitle}
                </p>
              )}
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className={`text-4xl font-semibold ${plan.popular ? "text-gradient-primary" : "text-foreground"}`}>
                  ${plan.price}
                </span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {plan.description}
              </p>

              {/* Callout chips */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {plan.callouts.map((c) => (
                  <span
                    key={c}
                    className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                      plan.popular
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/60 bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {c}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6 pb-5 border-b border-border/50">
                <span>
                  <strong className="text-foreground">{plan.users}</strong> users
                </span>
                <span>
                  <strong className="text-foreground">{plan.items}</strong> items
                </span>
              </div>

              <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 leading-relaxed">
                    {plan.popular ? (
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    ) : (
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    )}
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => (onSelectPlan ? onSelectPlan(plan.id) : onGetStarted())}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {!showComparison && (
          <p className="text-center text-sm">
            <Link to="/pricing" className="text-primary hover:underline underline-offset-4">Compare all features</Link>
          </p>
        )}

        {/* Feature Comparison Table */}
        {showComparison && (<>
        <div
          className={`transition-all duration-700 ease-apple ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{ transitionDelay: "500ms" }}
        >
          <h3 className="text-lg font-semibold text-center text-foreground mb-6">
            Compare every plan
          </h3>

          <div className="rounded-xl border border-border/70 bg-card shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground w-[36%]">
                      Feature
                    </th>
                    <th className="text-center px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground w-[16%]">
                      Starter
                    </th>
                    <th className="text-center px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground w-[16%]">
                      Operations
                    </th>
                    <th className="text-center px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary w-[16%]">
                      Logistics Pro
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonSections.map((section) => (
                    <React.Fragment key={section.title}>
                      <tr key={`header-${section.title}`} className="bg-muted/20">
                        <td
                          colSpan={4}
                          className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]"
                        >
                          {section.title}
                        </td>
                      </tr>
                      {section.rows.map((row) => (
                        <tr
                          key={row.label}
                          className="border-b border-border/30 last:border-0"
                        >
                          <td className="px-5 py-3.5 text-foreground leading-relaxed">
                            {row.label}
                          </td>
                          <td className="text-center px-4 py-3">
                            <AccessCell value={row.inventory} />
                          </td>
                          <td className="text-center px-4 py-3">
                            <AccessCell value={row.operations} />
                          </td>
                          <td className="text-center px-4 py-3 bg-primary/[0.05]">
                            <AccessCell value={row.operations_pro} />
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p
          className={`text-center text-sm text-muted-foreground mt-8 transition-all duration-700 ease-apple ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: "600ms" }}
        >
          14-day free trial · No card required
        </p>
        </>)}
      </div>
    </section>
  );
};
