/**
 * Guardrail Alerts Hook
 * 
 * Single source of truth for all actionable alerts across Team, Items, and Containers.
 * Alerts auto-resolve when the underlying issue is fixed.
 */

import { useMemo } from "react";
import { differenceInDays, isPast, isFuture, addDays } from "date-fns";
import { useCacheInventory } from "@/hooks/use-cache-inventory";
import { useEmployees } from "@/hooks/use-employees";
import { useBoxes } from "@/hooks/use-boxes";
import { useCheckouts } from "@/hooks/use-checkouts";
import { useMaintenance } from "@/hooks/use-maintenance";
import { 
  GuardrailAlert, 
  AlertSummary, 
  AlertsByCategory,
  AlertSeverity,
} from "@/types/alerts";

// Thresholds
const CREDENTIAL_WARNING_DAYS = [7, 14, 30];
const MAINTENANCE_WARNING_DAYS = 7;
const CHECKOUT_OVERDUE_DAYS = 0; // Any overdue
const ITEM_EXPIRATION_WARNING_DAYS = 30; // Items expiring within 30 days
const ITEM_EXPIRATION_CRITICAL_DAYS = 7; // Items expiring within 7 days are critical

/**
 * Generate Team Alerts
 */
const generateTeamAlerts = (employees: any[]): GuardrailAlert[] => {
  const alerts: GuardrailAlert[] = [];
  const now = new Date();

  employees.forEach(emp => {
    const empName = `${emp.first_name} ${emp.last_name}`;
    const requirements = emp.employee_requirements || [];

    // Check each requirement for issues
    requirements.forEach((req: any) => {
      if (!req.expire_date) return;
      
      const expiryDate = new Date(req.expire_date);
      const daysUntil = differenceInDays(expiryDate, now);

      // Critical: Expired credential
      if (isPast(expiryDate)) {
        const reqTitle = req.requirement?.title || "Credential";
        alerts.push({
          id: `team-expired-${req.id}`,
          type: "credential_expired",
          severity: "critical",
          category: "team",
          title: "Credential Expired",
          description: `${reqTitle} for ${empName} expired ${Math.abs(daysUntil)} days ago`,
          entityId: emp.id,
          entityName: empName,
          action: {
            label: "Renew Now",
            route: `/people?member=${emp.id}&tab=requirements`,
            openModal: "schedule_renewal",
          },
          metadata: {
            expiringRequirement: {
              employeeRequirementId: req.id,
              requirementId: req.requirement_id,
              title: reqTitle,
              renewalCycleMonths: req.requirement?.renewal_cycle_months ?? null,
              currentExpireDate: req.expire_date,
            },
            employee: {
              id: emp.id,
              firstName: emp.first_name,
              lastName: emp.last_name,
              email: emp.email,
              position: emp.position,
            },
          },
          createdAt: expiryDate,
          urgencyScore: Math.abs(daysUntil) * 10,
        });
      }
      // Warning: Expiring within 30 days
      else if (daysUntil <= 30 && daysUntil >= 0) {
        const reqTitle = req.requirement?.title || "Credential";
        alerts.push({
          id: `team-expiring-${req.id}`,
          type: "credential_expiring",
          severity: "warning",
          category: "team",
          title: daysUntil <= 7 ? "Credential Expiring Soon" : "Credential Expiring",
          description: `${reqTitle} for ${empName} expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
          entityId: emp.id,
          entityName: empName,
          action: {
            label: "Schedule Renewal",
            route: `/people?member=${emp.id}&tab=requirements`,
            openModal: "schedule_renewal",
          },
          metadata: {
            expiringRequirement: {
              employeeRequirementId: req.id,
              requirementId: req.requirement_id,
              title: reqTitle,
              renewalCycleMonths: req.requirement?.renewal_cycle_months ?? null,
              currentExpireDate: req.expire_date,
            },
            employee: {
              id: emp.id,
              firstName: emp.first_name,
              lastName: emp.last_name,
              email: emp.email,
              position: emp.position,
            },
          },
          createdAt: expiryDate,
          urgencyScore: 30 - daysUntil,
        });
      }
    });

    // Check for expired credentials only (not "Assigned" which is a neutral pending state)
    const expiredReqs = requirements.filter((r: any) => r.status === 'Expired');
    if (expiredReqs.length > 0) {
      const expiredRequirementsData = expiredReqs.map((r: any) => ({
        requirementId: r.requirement_id,
        employeeRequirementId: r.id,
        title: r.requirement?.title || r.requirement_definition?.title || "Credential",
        hasExpiration: r.requirement?.has_expiration ?? r.requirement_definition?.has_expiration ?? false,
        renewalCycleMonths: r.requirement?.renewal_cycle_months ?? r.requirement_definition?.renewal_cycle_months ?? null,
      }));

      alerts.push({
        id: `team-expired-${emp.id}`,
        type: "required_credential_missing",
        severity: "critical",
        category: "team",
        title: "Credential Expired",
        description: `${empName} has ${expiredReqs.length} expired credential${expiredReqs.length !== 1 ? 's' : ''}`,
        entityId: emp.id,
        entityName: empName,
        action: {
          label: "Resolve Credential",
          route: `/people?member=${emp.id}&tab=requirements`,
          openModal: "resolve_credential",
        },
        metadata: {
          missingRequirements: expiredRequirementsData,
          employee: {
            id: emp.id,
            firstName: emp.first_name,
            lastName: emp.last_name,
            email: emp.email,
            position: emp.position,
          },
        },
        createdAt: new Date(),
        urgencyScore: expiredReqs.length * 5,
      });
    }
  });

  return alerts;
};

/**
 * Generate Item (Asset) Alerts
 */
const generateItemAlerts = (
  items: any[], 
  maintenanceRecords: any[],
  checkouts: any[]
): GuardrailAlert[] => {
  const alerts: GuardrailAlert[] = [];
  const now = new Date();

  // Stock alerts from items
  items.forEach(item => {
    const itemName = item.description || item.subcategory || "Unnamed Item";
    const qty = item.quantity_available ?? 0;
    const criticalThreshold = item.critical_stock_threshold ?? 0;
    const lowThreshold = item.low_stock_threshold ?? 0;

    // Critical stock - only alert if qty is AT or BELOW threshold AND threshold is set
    // Alert auto-resolves when qty > criticalThreshold OR criticalThreshold is set to 0 or below qty
    if (criticalThreshold > 0 && qty <= criticalThreshold) {
      alerts.push({
        id: `item-critical-stock-${item.id}`,
        type: "critical_stock",
        severity: "critical",
        category: "item",
        title: "Critical Stock Level",
        description: `${itemName} has only ${qty} unit${qty !== 1 ? 's' : ''} (threshold: ${criticalThreshold})`,
        entityId: item.id,
        entityName: itemName,
        action: {
          label: "Review Stock",
          route: `/inventory?highlight=${item.id}`,
        },
        createdAt: new Date(item.updated_at || now),
        urgencyScore: criticalThreshold - qty + 10,
      });
    }
    // Low stock - only alert if qty is AT or BELOW threshold AND threshold is set
    // Alert auto-resolves when qty > lowThreshold OR lowThreshold is set to 0 or below qty
    else if (lowThreshold > 0 && qty <= lowThreshold) {
      alerts.push({
        id: `item-low-stock-${item.id}`,
        type: "low_stock",
        severity: "warning",
        category: "item",
        title: "Low Stock Warning",
        description: `${itemName} has ${qty} unit${qty !== 1 ? 's' : ''} remaining (threshold: ${lowThreshold})`,
        entityId: item.id,
        entityName: itemName,
        action: {
          label: "Review Stock",
          route: `/inventory?highlight=${item.id}`,
        },
        createdAt: new Date(item.updated_at || now),
        urgencyScore: lowThreshold - qty + 5,
      });
    }

    // Expired items (consumables with date_expire)
    if (item.date_expire) {
      const expiryDate = new Date(item.date_expire);
      const daysUntil = differenceInDays(expiryDate, now);

      // Critical: Item has expired
      if (isPast(expiryDate)) {
        const daysExpired = Math.abs(daysUntil);
        alerts.push({
          id: `item-expired-${item.id}`,
          type: "item_expired",
          severity: "critical", // Expired items are critical, not warning
          category: "item",
          title: "Item Expired",
          description: `${itemName} expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago`,
          entityId: item.id,
          entityName: itemName,
          action: {
            label: "Review",
            route: `/inventory?highlight=${item.id}`,
          },
          createdAt: expiryDate,
          urgencyScore: daysExpired * 10, // Higher score for longer expired
        });
      }
      // Critical Warning: Item expiring within 7 days
      else if (daysUntil <= ITEM_EXPIRATION_CRITICAL_DAYS && daysUntil >= 0) {
        alerts.push({
          id: `item-expiring-critical-${item.id}`,
          type: "item_expiring_soon",
          severity: "critical",
          category: "item",
          title: "Item Expiring Soon",
          description: `${itemName} expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
          entityId: item.id,
          entityName: itemName,
          action: {
            label: "Review",
            route: `/inventory?highlight=${item.id}`,
          },
          createdAt: expiryDate,
          urgencyScore: ITEM_EXPIRATION_CRITICAL_DAYS - daysUntil + 5, // Higher urgency for sooner expiry
        });
      }
      // Warning: Item expiring within 30 days (but more than 7)
      else if (daysUntil <= ITEM_EXPIRATION_WARNING_DAYS && daysUntil > ITEM_EXPIRATION_CRITICAL_DAYS) {
        alerts.push({
          id: `item-expiring-${item.id}`,
          type: "item_expiring_soon",
          severity: "warning",
          category: "item",
          title: "Item Expiring",
          description: `${itemName} expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
          entityId: item.id,
          entityName: itemName,
          action: {
            label: "Check Expiration",
            route: `/inventory?highlight=${item.id}`,
          },
          createdAt: expiryDate,
          urgencyScore: ITEM_EXPIRATION_WARNING_DAYS - daysUntil, // Higher urgency for sooner expiry
        });
      }
    }
  });

  // Maintenance alerts
  maintenanceRecords.forEach(record => {
    if (!record.scheduled_date && !record.next_maintenance_date) return;
    
    const maintenanceDate = new Date(record.scheduled_date || record.next_maintenance_date);
    const equipmentName = record.equipment?.name || "Equipment";
    const daysUntil = differenceInDays(maintenanceDate, now);

    // Overdue maintenance
    if (isPast(maintenanceDate) && record.status !== 'completed') {
      alerts.push({
        id: `item-maint-overdue-${record.id}`,
        type: "maintenance_overdue",
        severity: "critical",
        category: "item",
        title: "Maintenance Overdue",
        description: `${equipmentName} was due ${Math.abs(daysUntil)} days ago`,
        entityId: record.equipment_id,
        entityName: equipmentName,
        action: {
          label: "Schedule Service",
          route: `/inventory?highlight=${record.equipment_id}`,
        },
        createdAt: maintenanceDate,
        urgencyScore: Math.abs(daysUntil) * 2,
      });
    }
    // Maintenance due soon
    else if (daysUntil >= 0 && daysUntil <= MAINTENANCE_WARNING_DAYS && record.status !== 'completed') {
      alerts.push({
        id: `item-maint-due-${record.id}`,
        type: "maintenance_due_soon",
        severity: "warning",
        category: "item",
        title: "Maintenance Due Soon",
        description: `${equipmentName} due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
        entityId: record.equipment_id,
        entityName: equipmentName,
        action: {
          label: "Schedule",
          route: `/inventory?highlight=${record.equipment_id}`,
        },
        createdAt: maintenanceDate,
        urgencyScore: MAINTENANCE_WARNING_DAYS - daysUntil,
      });
    }
  });

  // Checkout alerts
  checkouts.forEach(checkout => {
    if (!checkout.due_date) return;
    
    const dueDate = new Date(checkout.due_date);
    const equipmentName = checkout.equipment?.name || "Equipment";
    const staffName = checkout.staff 
      ? `${checkout.staff.first_name} ${checkout.staff.last_name}`
      : "Unknown";

    if (isPast(dueDate) && checkout.status === 'active') {
      const daysOverdue = Math.abs(differenceInDays(dueDate, now));
      alerts.push({
        id: `item-checkout-overdue-${checkout.id}`,
        type: "checkout_overdue",
        severity: "critical",
        category: "item",
        title: "Checkout Overdue",
        description: `${equipmentName} due from ${staffName} — ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
        entityId: checkout.equipment_id,
        entityName: equipmentName,
        action: {
          label: "Follow Up",
          route: `/inventory?highlight=${checkout.equipment_id}`,
        },
        createdAt: dueDate,
        urgencyScore: daysOverdue * 3,
      });
    }
  });

  return alerts;
};

/**
 * Generate Container Alerts
 */
const generateContainerAlerts = (
  containers: any[],
  items: any[]
): GuardrailAlert[] => {
  const alerts: GuardrailAlert[] = [];
  const now = new Date();

  // Statuses that conflict with an empty container - these indicate the container should have items
  const conflictingStatuses = ["In Use", "Assigned", "Scheduled", "Deployed", "Active"];

  containers.forEach(container => {
    const containerName = container.box_number || "Unnamed Container";
    
    // Count items directly from inventory for real-time accuracy
    // This ensures the alert reflects the actual state, not a cached item_count
    const containerItems = items.filter(item => item.container_id === container.id);
    const actualItemCount = containerItems.length;
    
    // Only alert if container is empty AND has a conflicting status that implies it should have items
    // Statuses like "Empty", "Available", "Ready", "Standby" etc. don't conflict with being empty
    const hasConflictingStatus = conflictingStatuses.some(
      status => container.status_cache_box?.toLowerCase() === status.toLowerCase()
    );
    
    if (hasConflictingStatus && actualItemCount === 0) {
      alerts.push({
        id: `container-empty-${container.id}`,
        type: "container_empty_assigned",
        severity: "warning",
        category: "container",
        title: "Container Status Conflict",
        description: `${containerName} is marked "${container.status_cache_box}" but contains no items`,
        entityId: container.id,
        entityName: containerName,
        action: {
          label: "Add Items",
          route: `/inventory?tab=containers&highlight=${container.id}`,
          openModal: "open_container_drawer",
        },
        metadata: {
          container: container,
        },
        createdAt: new Date(container.updated_at || now),
        urgencyScore: 5,
      });
    }

    // Check for expired items in container (reuse containerItems from above)
    const expiredItems = containerItems.filter(item => {
      if (!item.date_expire) return false;
      return isPast(new Date(item.date_expire));
    });

    if (expiredItems.length > 0) {
      alerts.push({
        id: `container-expired-items-${container.id}`,
        type: "container_expired_items",
        severity: "critical",
        category: "container",
        title: "Container Has Expired Items",
        description: `${containerName} contains ${expiredItems.length} expired item${expiredItems.length !== 1 ? 's' : ''}`,
        entityId: container.id,
        entityName: containerName,
        action: {
          label: "Review Contents",
          route: `/inventory?tab=containers&highlight=${container.id}`,
        },
        createdAt: new Date(),
        urgencyScore: expiredItems.length * 3,
      });
    }
  });

  return alerts;
};

/**
 * Main hook for guardrail alerts
 */
export const useGuardrailAlerts = () => {
  const { employees, loading: loadingEmployees, refetch: refetchEmployees } = useEmployees();
  const { items, loading: loadingItems } = useCacheInventory();
  const { boxes, isLoading: loadingBoxes } = useBoxes();
  const { checkouts, loading: loadingCheckouts } = useCheckouts();
  const { maintenanceRecords, loading: loadingMaintenance } = useMaintenance();

  const loading = loadingEmployees || loadingItems || loadingBoxes || loadingCheckouts || loadingMaintenance;

  const alerts = useMemo(() => {
    if (loading) return { all: [], byCategory: { team: [], item: [], container: [] }, summary: { total: 0, critical: 0, warning: 0, info: 0 } };

    const teamAlerts = generateTeamAlerts(employees);
    const itemAlerts = generateItemAlerts(items, maintenanceRecords, checkouts);
    const containerAlerts = generateContainerAlerts(boxes, items);

    const allAlerts = [...teamAlerts, ...itemAlerts, ...containerAlerts];

    // Sort by severity (critical first), then urgency score
    const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
    allAlerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.urgencyScore - a.urgencyScore;
    });

    const byCategory: AlertsByCategory = {
      team: teamAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.urgencyScore - a.urgencyScore),
      item: itemAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.urgencyScore - a.urgencyScore),
      container: containerAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.urgencyScore - a.urgencyScore),
    };

    const summary: AlertSummary = {
      total: allAlerts.length,
      critical: allAlerts.filter(a => a.severity === "critical").length,
      warning: allAlerts.filter(a => a.severity === "warning").length,
      info: allAlerts.filter(a => a.severity === "info").length,
    };

    return { all: allAlerts, byCategory, summary };
  }, [employees, items, boxes, checkouts, maintenanceRecords, loading]);

  // Get only critical/warning alerts for dashboard attention section
  const dashboardAlerts = useMemo(() => {
    return alerts.all.filter(a => a.severity === "critical" || a.severity === "warning");
  }, [alerts]);

  // Get critical-only alerts (for urgent banners)
  const criticalAlerts = useMemo(() => {
    return alerts.all.filter(a => a.severity === "critical");
  }, [alerts]);

  const refetch = () => {
    refetchEmployees();
  };

  return {
    alerts: alerts.all,
    byCategory: alerts.byCategory,
    summary: alerts.summary,
    dashboardAlerts,
    criticalAlerts,
    loading,
    refetch,
  };
};

/**
 * Hook for inline alerts on a specific page
 */
export const usePageAlerts = (category: "team" | "item" | "container") => {
  const { byCategory, loading, refetch } = useGuardrailAlerts();
  
  return {
    alerts: byCategory[category],
    loading,
    hasCritical: byCategory[category].some(a => a.severity === "critical"),
    hasWarning: byCategory[category].some(a => a.severity === "warning"),
    count: byCategory[category].length,
    refetch,
  };
};
