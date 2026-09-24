/**
 * Feature Flag Registry — Every flag maps 1-to-1 to a row in the pricing PDF.
 *
 * Access levels per flag:
 *   "full"    — fully enabled on this plan
 *   "partial" — available with reduced functionality (label describes the level)
 *   "none"    — not available on this plan
 *
 * Usage:
 *   import { FEATURES, getFeatureAccess } from "@/config/feature-flags";
 *   const access = getFeatureAccess("operations", FEATURES.calendar_full);
 *   // → { enabled: false, level: "none" }
 */

import { type PlanId, PLAN_DISPLAY_NAMES } from "@/config/plans";

// ---------------------------------------------------------------------------
// Feature flag IDs — one per PDF row, no extras
// ---------------------------------------------------------------------------

export const FEATURES = {
  // ── Inventory Management ──────────────────────────────────────────────
  inventory_management:       "inventory_management",
  asset_container_crud:       "asset_container_crud",
  barcode_scanning:           "barcode_scanning",
  nested_container_hierarchy: "nested_container_hierarchy",
  custom_attributes:          "custom_attributes",
  bulk_operations:            "bulk_operations",
  expiration_stock_alerts:    "expiration_stock_alerts",
  csv_import_export:          "csv_import_export",
  inventory_print_view:       "inventory_print_view",
  unified_asset_table:        "unified_asset_table",
  activity_history:           "activity_history",

  // ── Team Management & Compliance ──────────────────────────────────────
  team_management:            "team_management",
  team_directory:             "team_directory",
  roles_departments:          "roles_departments",
  credential_assignment:      "credential_assignment",
  compliance_matrix:          "compliance_matrix",
  credential_alerts:          "credential_alerts",
  compliance_metrics:         "compliance_metrics",

  // ── Task Scheduling & Calendar ────────────────────────────────────────
  task_management_basic:      "task_management_basic",
  task_management_full:       "task_management_full",
  calendar_basic:             "calendar_basic",
  calendar_full:              "calendar_full",
  recurring_tasks:            "recurring_tasks",
  expiring_items_panel:       "expiring_items_panel",

  // ── Logistics & Layout Tools ──────────────────────────────────────────
  pallet_builder:             "pallet_builder",
  trailer_planner:            "trailer_planner",
  load_intelligence:          "load_intelligence",
  weight_distribution:        "weight_distribution",
  layout_export:              "layout_export",

  // ── Dashboards & Analytics ────────────────────────────────────────────
  analytics_basic:            "analytics_basic",
  analytics_advanced:         "analytics_advanced",
  analytics_full:             "analytics_full",

} as const;

export type FeatureFlag = (typeof FEATURES)[keyof typeof FEATURES];

// ---------------------------------------------------------------------------
// Access level per feature per plan
// ---------------------------------------------------------------------------

export type AccessLevel = "full" | "partial" | "none";

export interface FeatureAccess {
  enabled: boolean;       // true when level is "full" or "partial"
  level: AccessLevel;
  partialLabel?: string;  // e.g. "Manual Entry", "Limited", "Basic KPIs"
}

/**
 * Complete access matrix — every feature × every plan.
 * Values: true = "full", false = "none", string = "partial" (string is the label).
 */
type AccessEntry = true | false | string;

const ACCESS_MATRIX: Record<FeatureFlag, Record<PlanId, AccessEntry>> = {
  // ── Inventory Management ──────────────────────────────────────────────
  [FEATURES.inventory_management]:       { inventory: true,  operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.asset_container_crud]:       { inventory: true,  operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.barcode_scanning]:           { inventory: true,  operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.nested_container_hierarchy]: { inventory: true,  operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.custom_attributes]:          { inventory: true,  operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.bulk_operations]:            { inventory: true,  operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.expiration_stock_alerts]:    { inventory: true,  operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.csv_import_export]:          { inventory: true,  operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.inventory_print_view]:       { inventory: true,  operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.unified_asset_table]:        { inventory: true,  operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.activity_history]:           { inventory: true,  operations: true,  operations_pro: true, enterprise: true },

  // ── Team Management & Compliance ──────────────────────────────────────
  [FEATURES.team_management]:            { inventory: false, operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.team_directory]:             { inventory: false, operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.roles_departments]:          { inventory: false, operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.credential_assignment]:      { inventory: false, operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.compliance_matrix]:          { inventory: false, operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.credential_alerts]:          { inventory: false, operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.compliance_metrics]:         { inventory: false, operations: true,  operations_pro: true, enterprise: true },

  // ── Task Scheduling & Calendar (full calendar + recurring included in Operations) ─
  [FEATURES.task_management_basic]:      { inventory: false, operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.task_management_full]:       { inventory: false, operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.calendar_basic]:             { inventory: false, operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.calendar_full]:              { inventory: false, operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.recurring_tasks]:            { inventory: false, operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.expiring_items_panel]:       { inventory: false, operations: true,  operations_pro: true, enterprise: true },

  // ── Logistics & Layout Tools (Logistics Pro exclusive) ────────────────
  [FEATURES.pallet_builder]:             { inventory: false, operations: false, operations_pro: true, enterprise: true },
  [FEATURES.trailer_planner]:            { inventory: false, operations: false, operations_pro: true, enterprise: true },
  [FEATURES.load_intelligence]:          { inventory: false, operations: false, operations_pro: true, enterprise: true },
  [FEATURES.weight_distribution]:        { inventory: false, operations: false, operations_pro: true, enterprise: true },
  [FEATURES.layout_export]:              { inventory: false, operations: false, operations_pro: true, enterprise: true },

  // ── Dashboards & Analytics ────────────────────────────────────────────
  [FEATURES.analytics_basic]:            { inventory: true,  operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.analytics_advanced]:         { inventory: false, operations: true,  operations_pro: true, enterprise: true },
  [FEATURES.analytics_full]:             { inventory: false, operations: false, operations_pro: true, enterprise: true },
};

// ---------------------------------------------------------------------------
// Feature metadata — display labels and module grouping
// ---------------------------------------------------------------------------

export type FeatureModule =
  | "Inventory Management"
  | "Team Management & Compliance"
  | "Task Scheduling & Calendar"
  | "Logistics & Layout Tools"
  | "Dashboards & Analytics";

export interface FeatureMeta {
  flag: FeatureFlag;
  label: string;
  module: FeatureModule;
}

export const FEATURE_META: FeatureMeta[] = [
  // Inventory Management
  { flag: FEATURES.inventory_management,       label: "Inventory Management",                module: "Inventory Management" },
  { flag: FEATURES.asset_container_crud,       label: "Asset & Container CRUD",              module: "Inventory Management" },
  { flag: FEATURES.barcode_scanning,           label: "Barcode/QR Scanning",                 module: "Inventory Management" },
  { flag: FEATURES.nested_container_hierarchy, label: "Nested Container Hierarchy",           module: "Inventory Management" },
  { flag: FEATURES.custom_attributes,          label: "Custom Asset & Container Attributes", module: "Inventory Management" },
  { flag: FEATURES.bulk_operations,            label: "Bulk Operations (Delete, Relocate)",  module: "Inventory Management" },
  { flag: FEATURES.expiration_stock_alerts,    label: "Expiration & Stock Alerts",           module: "Inventory Management" },
  { flag: FEATURES.csv_import_export,          label: "CSV Import/Export",                   module: "Inventory Management" },
  { flag: FEATURES.inventory_print_view,       label: "Inventory Print View",                module: "Inventory Management" },
  { flag: FEATURES.unified_asset_table,        label: "Unified Asset Table & Inline Editing",module: "Inventory Management" },
  { flag: FEATURES.activity_history,           label: "Activity History",                    module: "Inventory Management" },
  // Team Management & Compliance
  { flag: FEATURES.team_management,            label: "Team Management & Compliance",        module: "Team Management & Compliance" },
  { flag: FEATURES.team_directory,             label: "Team Directory & Member Profiles",    module: "Team Management & Compliance" },
  { flag: FEATURES.roles_departments,          label: "Roles, Departments, Statuses",        module: "Team Management & Compliance" },
  { flag: FEATURES.credential_assignment,      label: "Credential Definitions & Assignment", module: "Team Management & Compliance" },
  { flag: FEATURES.compliance_matrix,          label: "Compliance Matrix & Momentum View",   module: "Team Management & Compliance" },
  { flag: FEATURES.credential_alerts,          label: "Credential Expiration Alerts",        module: "Team Management & Compliance" },
  { flag: FEATURES.compliance_metrics,         label: "Compliance Filters & Metrics",        module: "Team Management & Compliance" },
  // Task Scheduling & Calendar
  { flag: FEATURES.task_management_basic,      label: "Add/View Tasks",                      module: "Task Scheduling & Calendar" },
  { flag: FEATURES.task_management_full,       label: "Add/View Tasks (Full)",               module: "Task Scheduling & Calendar" },
  { flag: FEATURES.calendar_basic,             label: "Calendar Views (Day/Week/Month)",     module: "Task Scheduling & Calendar" },
  { flag: FEATURES.calendar_full,              label: "Calendar Views (Full)",               module: "Task Scheduling & Calendar" },
  { flag: FEATURES.recurring_tasks,            label: "Recurring Tasks, Drag & Drop",        module: "Task Scheduling & Calendar" },
  { flag: FEATURES.expiring_items_panel,       label: "Expiring Items Panel",                module: "Task Scheduling & Calendar" },
  // Logistics & Layout Tools
  { flag: FEATURES.pallet_builder,             label: "Pallet Builder (2D Layout)",          module: "Logistics & Layout Tools" },
  { flag: FEATURES.trailer_planner,            label: "Trailer/Space Planner",               module: "Logistics & Layout Tools" },
  { flag: FEATURES.load_intelligence,          label: "Load Intelligence & Auto-Pack",       module: "Logistics & Layout Tools" },
  { flag: FEATURES.weight_distribution,        label: "Weight Distribution Panel",           module: "Logistics & Layout Tools" },
  { flag: FEATURES.layout_export,              label: "Save/Load/Export Layouts",             module: "Logistics & Layout Tools" },
  // Dashboards & Analytics
  { flag: FEATURES.analytics_basic,            label: "Inventory/Team Metrics Strip",        module: "Dashboards & Analytics" },
  { flag: FEATURES.analytics_advanced,         label: "Compliance & Needs Attention Panels", module: "Dashboards & Analytics" },
  { flag: FEATURES.analytics_full,             label: "Workspace Insights & Equipment Chart",module: "Dashboards & Analytics" },
];

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

/**
 * Get the access state for a feature on a given plan.
 */
export function getFeatureAccess(planId: PlanId, flag: FeatureFlag): FeatureAccess {
  const entry = ACCESS_MATRIX[flag]?.[planId];

  if (entry === true) {
    return { enabled: true, level: "full" };
  }
  if (typeof entry === "string") {
    return { enabled: true, level: "partial", partialLabel: entry };
  }
  return { enabled: false, level: "none" };
}

/**
 * Check if a feature is available (full or partial) on a given plan.
 */
export function isFeatureAvailable(planId: PlanId, flag: FeatureFlag): boolean {
  return getFeatureAccess(planId, flag).enabled;
}

/**
 * Check if a feature has full access (not partial) on a given plan.
 */
export function isFeatureFull(planId: PlanId, flag: FeatureFlag): boolean {
  return getFeatureAccess(planId, flag).level === "full";
}

/**
 * Return the lowest plan that gives full access to a feature.
 */
export function getRequiredPlanForFeature(flag: FeatureFlag): PlanId {
  const ordered: PlanId[] = ["inventory", "operations", "operations_pro", "enterprise"];
  for (const id of ordered) {
    if (ACCESS_MATRIX[flag]?.[id] === true) return id;
  }
  return "enterprise";
}

/**
 * Return the display name of the plan required for a feature.
 */
export function getRequiredPlanName(flag: FeatureFlag): string {
  return PLAN_DISPLAY_NAMES[getRequiredPlanForFeature(flag)];
}

/**
 * Get all features for a specific module.
 */
export function getModuleFeatures(module: FeatureModule): FeatureMeta[] {
  return FEATURE_META.filter((f) => f.module === module);
}

/**
 * Get all feature flags that are fully enabled for a given plan.
 */
export function getEnabledFlags(planId: PlanId): FeatureFlag[] {
  return Object.keys(ACCESS_MATRIX).filter(
    (flag) => ACCESS_MATRIX[flag as FeatureFlag][planId] === true
  ) as FeatureFlag[];
}

/**
 * Get all feature flags that are disabled (none) for a given plan.
 */
export function getDisabledFlags(planId: PlanId): FeatureFlag[] {
  return Object.keys(ACCESS_MATRIX).filter(
    (flag) => ACCESS_MATRIX[flag as FeatureFlag][planId] === false
  ) as FeatureFlag[];
}
