/**
 * Guardrail-Based Alert System Types
 * 
 * Alerts are actionable, time-sensitive, and auto-resolving.
 * NOT for informational metrics or historical activity.
 */

export type AlertSeverity = "critical" | "warning" | "info";

export type AlertCategory = "team" | "item" | "container";

export type AlertType = 
  // Team alerts
  | "credential_expired"
  | "credential_expiring"
  | "required_credential_missing"
  | "inactive_member_with_assets"
  | "required_attribute_missing"
  // Item alerts
  | "maintenance_overdue"
  | "maintenance_due_soon"
  | "checkout_overdue"
  | "low_stock"
  | "critical_stock"
  | "item_expired"
  | "item_expiring_soon"
  | "status_inconsistency"
  // Container alerts
  | "container_empty_assigned"
  | "container_capacity_exceeded"
  | "container_approaching_capacity"
  | "container_expired_items";

export interface AlertActionMetadata {
  /** For credential alerts: the employee requirements that need resolution */
  missingRequirements?: Array<{
    requirementId: string;
    employeeRequirementId: string;
    title: string;
    hasExpiration?: boolean;
    renewalCycleMonths?: number | null;
  }>;
  /** For expiring/expired credential alerts: the specific requirement to renew */
  expiringRequirement?: {
    employeeRequirementId: string;
    requirementId: string;
    title: string;
    renewalCycleMonths?: number | null;
    currentExpireDate: string;
  };
  /** For credential alerts: the employee info */
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    position?: string | null;
  };
  /** For container alerts: the container data */
  container?: any;
  /** For item/stock alerts: the item data */
  item?: any;
}

export interface GuardrailAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  entityId: string;
  entityName: string;
  action: {
    label: string;
    route: string;
    /** Whether this action should open a modal instead of navigating */
    openModal?: "resolve_credential" | "schedule_renewal" | "open_container_drawer" | "open_item_drawer";
  };
  /** Extra data needed for resolution actions */
  metadata?: AlertActionMetadata;
  createdAt: Date;
  /** For sorting within same severity */
  urgencyScore: number;
}

export interface AlertSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
}

export interface AlertsByCategory {
  team: GuardrailAlert[];
  item: GuardrailAlert[];
  container: GuardrailAlert[];
}

// Alert display configuration
export const alertSeverityConfig = {
  critical: {
    label: "Critical",
    dotColor: "bg-destructive",
    textColor: "text-destructive",
    bgColor: "bg-destructive/8",
    borderColor: "border-destructive/20",
  },
  warning: {
    label: "Warning",
    dotColor: "bg-warning",
    textColor: "text-warning",
    bgColor: "bg-warning/8",
    borderColor: "border-warning/15",
  },
  info: {
    label: "Info",
    dotColor: "bg-primary",
    textColor: "text-primary",
    bgColor: "bg-primary/8",
    borderColor: "border-primary/15",
  },
} as const;
