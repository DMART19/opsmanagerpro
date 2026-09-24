/**
 * Value descriptions for gated features — used in soft upgrade prompts.
 * Supports both legacy GatedFeature keys and new FeatureFlag keys.
 */

import { GatedFeature } from "@/contexts/SubscriptionContext";
import { FeatureFlag } from "@/config/feature-flags";

interface FeatureDescription {
  headline: string;
  value: string;
  bullets: string[];
}

/**
 * Legacy GatedFeature descriptions — used by FeatureLockBanner and existing components.
 */
export const FEATURE_DESCRIPTIONS: Record<GatedFeature, FeatureDescription> = {
  "Pallet Builder": {
    headline: "Plan, pack, and optimize pallet layouts visually.",
    value: "Reduce shipping errors and maximize space utilization with drag-and-drop pallet planning.",
    bullets: [
      "Visual drag-and-drop layout editor",
      "Weight and dimension tracking",
      "Save and reuse pallet configurations",
    ],
  },
  "Calendar": {
    headline: "Schedule inspections, maintenance, and team tasks.",
    value: "Keep operations on track with a centralized calendar for all recurring and one-time tasks.",
    bullets: [
      "Maintenance and inspection scheduling",
      "Task assignment and tracking",
      "Date-based operational planning",
    ],
  },
  "Team": {
    headline: "Manage your team roster and assignments.",
    value: "Organize staff, assign roles, and track availability across your operation.",
    bullets: [
      "Centralized team directory",
      "Role and department management",
      "Checkout and assignment tracking",
    ],
  },
  "Credentials": {
    headline: "Track certifications, licenses, and compliance.",
    value: "Stay audit-ready with automated credential tracking and expiration alerts.",
    bullets: [
      "Certification and license tracking",
      "Expiration monitoring and alerts",
      "Compliance reporting dashboard",
    ],
  },
};

/**
 * Feature flag descriptions — used by FeatureGate and new gating components.
 * Keys map to FeatureFlag values from feature-flags.ts.
 */
export const FLAG_DESCRIPTIONS: Partial<Record<FeatureFlag, FeatureDescription>> = {
  // Team Management & Compliance
  team_management: FEATURE_DESCRIPTIONS["Team"],
  team_directory: FEATURE_DESCRIPTIONS["Team"],
  roles_departments: {
    headline: "Organize team roles and departments.",
    value: "Define roles, departments, and statuses to keep your workforce organized.",
    bullets: [
      "Custom role definitions",
      "Department grouping",
      "Status tracking per member",
    ],
  },
  credential_assignment: FEATURE_DESCRIPTIONS["Credentials"],
  compliance_matrix: {
    headline: "Visualize compliance across your entire team.",
    value: "See at a glance which team members are compliant, expiring, or missing credentials.",
    bullets: [
      "Full team compliance matrix",
      "Momentum tracking view",
      "Gap analysis and reporting",
    ],
  },
  credential_alerts: {
    headline: "Never miss an expiring credential.",
    value: "Automated alerts ensure your team stays compliant before deadlines hit.",
    bullets: [
      "Expiration date monitoring",
      "Configurable alert thresholds",
      "Dashboard notification badges",
    ],
  },
  compliance_metrics: {
    headline: "Measure compliance performance.",
    value: "Track compliance rates, identify trends, and generate audit-ready reports.",
    bullets: [
      "Compliance percentage tracking",
      "Filterable metrics dashboard",
      "Historical trend analysis",
    ],
  },

  // Task Scheduling & Calendar
  task_management_basic: {
    headline: "Add and view tasks manually.",
    value: "Get started with basic task tracking — add, view, and manage individual tasks.",
    bullets: [
      "Manual task creation",
      "Task list and status tracking",
      "Basic task details",
    ],
  },
  task_management_full: {
    headline: "Full task management with automation.",
    value: "Unlock the complete task management suite with recurring tasks and advanced workflows.",
    bullets: [
      "Recurring task schedules",
      "Drag-and-drop organization",
      "Advanced task workflows",
    ],
  },
  calendar_basic: {
    headline: "View tasks on a calendar.",
    value: "See your tasks and deadlines on day, week, and month views.",
    bullets: [
      "Day, week, and month views",
      "Task deadline visualization",
      "Basic calendar navigation",
    ],
  },
  calendar_full: FEATURE_DESCRIPTIONS["Calendar"],
  recurring_tasks: {
    headline: "Automate recurring tasks.",
    value: "Set up recurring inspections, maintenance, and team assignments that repeat automatically.",
    bullets: [
      "Configurable repeat schedules",
      "Drag-and-drop rescheduling",
      "Automatic task generation",
    ],
  },
  expiring_items_panel: {
    headline: "Track expiring items at a glance.",
    value: "A dedicated panel showing all items nearing expiration with actionable alerts.",
    bullets: [
      "Unified expiration timeline",
      "Severity-based prioritization",
      "One-click renewal actions",
    ],
  },

  // Logistics & Layout Tools
  pallet_builder: FEATURE_DESCRIPTIONS["Pallet Builder"],
  trailer_planner: {
    headline: "Plan trailer and space layouts.",
    value: "Visually arrange cargo in trailers to maximize space and weight distribution.",
    bullets: [
      "2D trailer layout planner",
      "Real-time weight tracking",
      "Space utilization metrics",
    ],
  },
  load_intelligence: {
    headline: "AI-assisted load optimization.",
    value: "Automatically optimize pallet and cargo placement for maximum efficiency.",
    bullets: [
      "Auto-pack algorithms",
      "Weight distribution analysis",
      "Load sequence recommendations",
    ],
  },
  weight_distribution: {
    headline: "Visualize weight across loads.",
    value: "Real-time weight distribution panel to ensure safe and balanced cargo loads.",
    bullets: [
      "Live weight heatmap",
      "Center of gravity tracking",
      "Overweight alerts",
    ],
  },
  layout_export: {
    headline: "Save and export load layouts.",
    value: "Save layouts for reuse, share with your team, or export for documentation.",
    bullets: [
      "Save configurations to library",
      "Load saved layouts instantly",
      "Export as PDF or image",
    ],
  },

  // Dashboards & Analytics
  analytics_basic: {
    headline: "Basic inventory and team KPIs.",
    value: "Track essential metrics with the inventory and team metrics strip.",
    bullets: [
      "Asset count and status overview",
      "Team member summary",
      "Quick-glance KPI cards",
    ],
  },
  analytics_advanced: {
    headline: "Advanced compliance and operational metrics.",
    value: "Unlock compliance dashboards, needs-attention panels, and deeper operational insights.",
    bullets: [
      "Compliance status panels",
      "Needs attention alerts",
      "Workspace-level insights",
    ],
  },
  analytics_full: {
    headline: "Full analytics suite.",
    value: "Complete analytics with equipment status charts, workspace insights, and trend analysis.",
    bullets: [
      "Equipment status chart",
      "Workspace performance insights",
      "Full historical analytics",
    ],
  },
};
