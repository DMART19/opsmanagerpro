/**
 * Plan Model — Single source of truth for OpsManagerPro pricing tiers.
 *
 * Extracted from the official OpsManagerPro Pricing & Feature Comparison PDF.
 * All feature gating, usage limits, and billing UI should reference this file.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanId = "inventory" | "operations" | "operations_pro" | "enterprise";

/**
 * Features that are fully enabled or disabled per plan.
 * Each string maps 1-to-1 with a product capability.
 */
export type PlanFeature =
  // Inventory Management
  | "asset_container_crud"
  | "barcode_qr_scanning"
  | "nested_container_hierarchy"
  | "custom_asset_container_attributes"
  | "bulk_operations"
  | "expiration_stock_alerts"
  | "csv_import_export"
  | "inventory_print_view"
  | "unified_asset_table_inline_editing"
  | "activity_history"
  // Team Management & Compliance
  | "team_directory_member_profiles"
  | "roles_departments_statuses"
  | "credential_definitions_assignment"
  | "compliance_matrix_momentum_view"
  | "credential_expiration_alerts"
  | "compliance_filters_metrics"
  // Task Scheduling & Calendar
  | "add_view_tasks"
  | "calendar_views"
  | "recurring_tasks_drag_drop"
  | "expiring_items_panel"
  // Logistics & Layout Tools
  | "pallet_builder"
  | "trailer_space_planner"
  | "load_intelligence_auto_pack"
  | "weight_distribution_panel"
  | "save_load_export_layouts"
  // Dashboards & Analytics
  | "inventory_team_metrics_strip"
  | "compliance_needs_attention_panels"
  | "workspace_insights"
  | "equipment_status_chart";

/**
 * Partial feature access — indicates a feature is available but with
 * reduced functionality compared to a higher tier.
 */
export interface PartialFeature {
  feature: PlanFeature;
  level: string; // e.g. "Manual Entry", "Limited", "Basic KPIs"
}

/**
 * Immutable plan definition used throughout the application.
 */
export interface Plan {
  id: PlanId;
  name: string;
  monthly_price: number;
  max_users: number;
  asset_limit: number;
  warehouse_location_limit: number; // Infinity = unlimited
  enabled_features: PlanFeature[];
  partial_features: PartialFeature[];
}

// ---------------------------------------------------------------------------
// Feature groups (for display / iteration convenience)
// ---------------------------------------------------------------------------

export const INVENTORY_FEATURES: PlanFeature[] = [
  "asset_container_crud",
  "barcode_qr_scanning",
  "nested_container_hierarchy",
  "custom_asset_container_attributes",
  "bulk_operations",
  "expiration_stock_alerts",
  "csv_import_export",
  "inventory_print_view",
  "unified_asset_table_inline_editing",
  "activity_history",
];

export const TEAM_COMPLIANCE_FEATURES: PlanFeature[] = [
  "team_directory_member_profiles",
  "roles_departments_statuses",
  "credential_definitions_assignment",
  "compliance_matrix_momentum_view",
  "credential_expiration_alerts",
  "compliance_filters_metrics",
];

export const CALENDAR_FEATURES: PlanFeature[] = [
  "add_view_tasks",
  "calendar_views",
  "recurring_tasks_drag_drop",
  "expiring_items_panel",
];

export const LOGISTICS_FEATURES: PlanFeature[] = [
  "pallet_builder",
  "trailer_space_planner",
  "load_intelligence_auto_pack",
  "weight_distribution_panel",
  "save_load_export_layouts",
];

export const DASHBOARD_FEATURES: PlanFeature[] = [
  "inventory_team_metrics_strip",
  "compliance_needs_attention_panels",
  "workspace_insights",
  "equipment_status_chart",
];

export const ALL_FEATURES: PlanFeature[] = [
  ...INVENTORY_FEATURES,
  ...TEAM_COMPLIANCE_FEATURES,
  ...CALENDAR_FEATURES,
  ...LOGISTICS_FEATURES,
  ...DASHBOARD_FEATURES,
];

// ---------------------------------------------------------------------------
// Plan definitions — matches OpsManagerPro Pricing PDF exactly
// ---------------------------------------------------------------------------

export const PLANS: Record<PlanId, Plan> = {
  inventory: {
    id: "inventory",
    name: "Starter",
    monthly_price: 49,
    max_users: 3,
    asset_limit: 500,
    warehouse_location_limit: 1,
    enabled_features: [
      ...INVENTORY_FEATURES,
      "inventory_team_metrics_strip",
    ],
    partial_features: [
      // Dashboards available at "Basic KPIs" level only
    ],
  },

  operations: {
    id: "operations",
    name: "Operations",
    monthly_price: 119,
    max_users: 10,
    asset_limit: 2_500,
    warehouse_location_limit: 2,
    enabled_features: [
      ...INVENTORY_FEATURES,
      ...TEAM_COMPLIANCE_FEATURES,
      // Full calendar + recurring tasks (moved down from Pro)
      "add_view_tasks",
      "calendar_views",
      "recurring_tasks_drag_drop",
      "expiring_items_panel",
      // Dashboards — Advanced Metrics level
      "inventory_team_metrics_strip",
      "compliance_needs_attention_panels",
      "workspace_insights",
      "equipment_status_chart",
    ],
    partial_features: [],
  },

  operations_pro: {
    id: "operations_pro",
    name: "Logistics Pro",
    monthly_price: 249,
    max_users: 30,
    asset_limit: 10_000,
    warehouse_location_limit: 5,
    enabled_features: [...ALL_FEATURES],
    partial_features: [],
  },

  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    monthly_price: 0, // Enterprise is custom pricing (contact sales)
    max_users: 999_999,
    asset_limit: 999_999,
    warehouse_location_limit: Number.POSITIVE_INFINITY,
    enabled_features: [...ALL_FEATURES],
    partial_features: [],
  },
};

// ---------------------------------------------------------------------------
// Tier ordering — used for plan comparison (upgrade / downgrade checks)
// ---------------------------------------------------------------------------

export const PLAN_TIER_ORDER: Record<PlanId, number> = {
  inventory: 0,
  operations: 1,
  operations_pro: 2,
  enterprise: 3,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Display-friendly plan names */
export const PLAN_DISPLAY_NAMES: Record<PlanId, string> = {
  inventory: "Starter",
  operations: "Operations",
  operations_pro: "Logistics Pro",
  enterprise: "Enterprise",
};

/** Monthly prices (0 = custom / contact sales) */
export const PLAN_PRICES: Record<PlanId, number> = {
  inventory: 49,
  operations: 119,
  operations_pro: 249,
  enterprise: 0,
};

/** Display-friendly price labels */
export const PLAN_PRICE_LABELS: Record<PlanId, string> = {
  inventory: "$49/month",
  operations: "$119/month",
  operations_pro: "$249/month",
  enterprise: "Custom",
};

/**
 * Check if a plan fully enables a given feature.
 */
export function isFeatureEnabled(planId: PlanId, feature: PlanFeature): boolean {
  return PLANS[planId].enabled_features.includes(feature);
}

/**
 * Check if a plan has partial access to a feature (returns the level string or null).
 */
export function getPartialFeatureLevel(planId: PlanId, feature: PlanFeature): string | null {
  const match = PLANS[planId].partial_features.find((p) => p.feature === feature);
  return match?.level ?? null;
}

/**
 * Check if a feature is available at all (full or partial) on a given plan.
 */
export function hasFeatureAccess(planId: PlanId, feature: PlanFeature): boolean {
  return (
    isFeatureEnabled(planId, feature) ||
    PLANS[planId].partial_features.some((p) => p.feature === feature)
  );
}

/**
 * Return the lowest plan that fully enables a given feature.
 */
export function getRequiredPlan(feature: PlanFeature): PlanId {
  const ordered: PlanId[] = ["inventory", "operations", "operations_pro", "enterprise"];
  for (const id of ordered) {
    if (isFeatureEnabled(id, feature)) return id;
  }
  return "operations_pro"; // fallback
}
