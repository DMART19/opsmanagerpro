/**
 * Tour step definitions for the public /tour walkthrough.
 *
 * Every step provides:
 *  - route             — where the engine navigates before resolving the target
 *  - target / mobileTarget — `data-tour` selectors; falls back to centered if missing
 *  - placement         — preferred tooltip side (smart-clamped at render time)
 *  - centeredFallback{Title,Description} — used when the target can't be resolved
 */
export type Placement = "top" | "bottom" | "left" | "right" | "auto";

export interface TourStep {
  id: string;
  section: string;
  route: string;
  /** data-tour attribute value, or undefined for an intentionally centered step. */
  target?: string;
  mobileTarget?: string;
  placement?: Placement;
  title: string;
  description: string;
  centeredFallbackTitle?: string;
  centeredFallbackDescription?: string;
  /** Auto-advance after this many ms; undefined = manual only. */
  durationMs?: number;
  /** Final step disables auto-advance and shows the conversion CTAs. */
  isFinal?: boolean;
  /** Optional checklist bullets, rendered only on the final step. */
  bullets?: string[];
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    section: "Welcome",
    route: "/dashboard",
    title: "Welcome to OpsManagerPro",
    description:
      "A short, hands-on tour of how inventory, operations, personnel, and scheduling come together in one platform.",
    durationMs: 6000,
  },
  {
    id: "dashboard",
    section: "Dashboard",
    route: "/dashboard",
    target: "dashboard-kpis",
    mobileTarget: "mobile-metrics",
    placement: "bottom",
    title: "See everything at a glance",
    description:
      "See your most important information the moment you log in. Quickly identify issues before they become problems.",
    centeredFallbackTitle: "See everything at a glance",
    centeredFallbackDescription:
      "See your most important information the moment you log in. Quickly identify issues before they become problems.",
    durationMs: 8000,
  },
  {
    id: "inventory",
    section: "Inventory",
    route: "/inventory",
    target: "inventory-table",
    mobileTarget: "inventory-table",
    placement: "top",
    title: "Find inventory instantly",
    description:
      "Know exactly what you have and where it lives. Search, update, and organize inventory without spreadsheets.",
    centeredFallbackTitle: "Find inventory instantly",
    centeredFallbackDescription:
      "Know exactly what you have and where it lives. Search, update, and organize inventory without spreadsheets.",
    durationMs: 9000,
  },
  {
    id: "operations",
    section: "Operations",
    route: "/pallet-builder",
    target: "item-library",
    mobileTarget: "mobile-item-library",
    placement: "right",
    title: "Build and organize shipments",
    description:
      "Organize inventory into shipments and operational loads. Instantly see capacity, weight, and space utilization as you build.",
    centeredFallbackTitle: "Build and organize shipments",
    centeredFallbackDescription:
      "Organize inventory into shipments and operational loads. Instantly see capacity, weight, and space utilization as you build.",
    durationMs: 9000,
  },
  {
    id: "team",
    section: "Team",
    route: "/people",
    target: "team-metrics",
    mobileTarget: "mobile-team-summary",
    placement: "bottom",
    title: "Keep your workforce organized",
    description:
      "Keep certifications, roles, and personnel in one place. See who's qualified, who needs attention, and who's assigned.",
    centeredFallbackTitle: "Keep your workforce organized",
    centeredFallbackDescription:
      "Keep certifications, roles, and personnel in one place. See who's qualified, who needs attention, and who's assigned.",
    durationMs: 9000,
  },
  {
    id: "calendar",
    section: "Calendar",
    route: "/calendar",
    target: "calendar-actions",
    mobileTarget: "calendar-actions",
    placement: "bottom",
    title: "Stay ahead of important work",
    description:
      "Never miss inspections, audits, maintenance, or deadlines. Keep recurring tasks and events organized in one calendar.",
    centeredFallbackTitle: "Stay ahead of important work",
    centeredFallbackDescription:
      "Never miss inspections, audits, maintenance, or deadlines. Keep recurring tasks and events organized in one calendar.",
    durationMs: 8000,
  },
  {
    id: "navigation",
    section: "Navigation",
    route: "/dashboard",
    target: "nav-inventory",
    mobileTarget: "mobile-nav-toggle",
    placement: "bottom",
    title: "Move through the system effortlessly",
    description:
      "Jump between inventory, operations, team, and calendar in one click — no menu diving, no lost context.",
    centeredFallbackTitle: "Move through the system effortlessly",
    centeredFallbackDescription:
      "Jump between inventory, operations, team, and calendar in one click — no menu diving, no lost context.",
    durationMs: 7000,
  },
  {
    id: "complete",
    section: "You're ready",
    route: "/dashboard",
    title: "You're ready to manage operations more efficiently",
    description:
      "You've seen how OpsManagerPro helps you manage the daily work that keeps operations moving.",
    bullets: [
      "Track inventory",
      "Organize operations",
      "Manage personnel",
      "Schedule activities",
      "Navigate the platform",
    ],
    isFinal: true,
  },
];