/**
 * Unified Stats Hook - Single Source of Truth
 * 
 * This hook provides consistent statistics across the entire application.
 * All dashboard cards, charts, and page metrics should use this hook
 * to ensure data integrity and consistency.
 * 
 * DEMO MODE: Uses in-memory data from DemoDataContext
 * PRODUCTION MODE: Uses real database sources
 */

import { useMemo } from "react";
import { useCacheInventory } from "@/hooks/use-cache-inventory";
import { useEmployees } from "@/hooks/use-employees";
import { useRequirements } from "@/hooks/use-requirements";
import { useTasks } from "@/hooks/use-tasks";
import { useDemoDataOptional } from "@/contexts/DemoDataContext";
import { useTourMode } from "@/contexts/TourModeContext";

export interface AssetStats {
  total: number;
  available: number;
  inUse: number;
  underService: number;
  lowStock: number;
  criticalStock: number;
}

export interface TeamStats {
  total: number;
  compliant: number;
  expiringSoon: number;
  incomplete: number;
}

export interface CredentialStats {
  total: number;
  expiringSoon: number;
  expired: number;
}

export interface MaintenanceStats {
  dueThisWeek: number;
  dueNextWeek: number;
}

export interface UnifiedStats {
  assets: AssetStats;
  team: TeamStats;
  credentials: CredentialStats;
  maintenance: MaintenanceStats;
  loading: boolean;
  isUsingDemoFallback: boolean;
}

/**
 * Classify asset status using the resolved status name from the asset_statuses join.
 * The statusName param is the human-readable name from the relational lookup.
 */
const classifyAssetStatus = (statusName: string | null): 'available' | 'inUse' | 'underService' => {
  if (!statusName) return 'available';
  
  const normalized = statusName.toLowerCase().trim();
  
  // In Use statuses
  if (['out', 'in use', 'assigned', 'checked out', 'checked_out', 'fully checked out'].includes(normalized)) {
    return 'inUse';
  }
  
  // Under Service statuses
  if (['maint', 'maintenance', 'under service', 'service', 'repair'].includes(normalized)) {
    return 'underService';
  }
  
  // Default to available
  return 'available';
};

export const useUnifiedStats = (): UnifiedStats => {
  const { isTourMode } = useTourMode();
  const demoData = useDemoDataOptional();
  
  // Production data hooks
  const { items: prodInventoryItems, loading: loadingInventory } = useCacheInventory();
  const { employees: prodEmployees, loading: loadingEmployees } = useEmployees();
  const { requirements: prodRequirements, loading: loadingRequirements } = useRequirements();
  const { tasks: prodTasks, isLoading: loadingTasks } = useTasks();

  // Determine data source based on demo mode
  const inventoryItems = useMemo(() => {
    if (isTourMode && demoData) {
      return demoData.assets.map(asset => ({
        ...asset,
        status_item: asset.status_item,
        quantity_available: asset.quantity_available,
        low_stock_threshold: asset.low_stock_threshold,
        critical_stock_threshold: asset.critical_stock_threshold,
      }));
    }
    return prodInventoryItems;
  }, [isTourMode, demoData, prodInventoryItems]);

  const employees = useMemo(() => {
    if (isTourMode && demoData) {
      return demoData.employees;
    }
    return prodEmployees;
  }, [isTourMode, demoData, prodEmployees]);

  // Credential stats - derived from employee requirements_stats in demo, from requirement_definitions in prod
  const credentialStats = useMemo((): CredentialStats => {
    if (isTourMode && demoData) {
      // In demo mode, derive credential stats from actual demo requirements
      const activeReqs = demoData.requirements.filter(r => r.is_active);
      const total = activeReqs.length;
      let expiringSoon = 0;
      let expired = 0;
      
      const now = new Date();
      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      
      demoData.employeeRequirements.forEach(er => {
        if (!er.expire_date) return;
        const expiryDate = new Date(er.expire_date);
        if (expiryDate <= now && er.status !== 'Compliant') {
          expired++;
        } else if (expiryDate > now && expiryDate <= sixtyDaysFromNow) {
          expiringSoon++;
        }
      });
      
      return { total, expiringSoon, expired };
    }

    const activeRequirements = prodRequirements.filter((r: any) => r.is_active !== false);
    const total = activeRequirements.length;

    let expired = 0;
    let expiringSoon = 0;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    activeRequirements.forEach((req: any) => {
      const empReqs = req.employee_requirements || [];
      empReqs.forEach((er: any) => {
        if (!er.expire_date) return;
        const expiryDate = new Date(er.expire_date);
        if (expiryDate <= now && er.status !== 'compliant' && er.status !== 'renewed') {
          expired++;
        } else if (expiryDate > now && expiryDate <= thirtyDaysFromNow) {
          expiringSoon++;
        }
      });
    });

    return { total, expiringSoon, expired };
  }, [isTourMode, demoData, prodRequirements]);

  // Task stats from demo tasks or the tasks table
  const taskStats = useMemo((): MaintenanceStats => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const taskList = isTourMode && demoData ? demoData.tasks : prodTasks;

    const pendingTasks = taskList.filter(
      (t) => t.status === 'pending' || t.status === 'in_progress'
    );

    const dueThisWeek = pendingTasks.filter((t) => {
      const d = new Date(t.start_date);
      return d >= new Date(now.toDateString()) && d <= oneWeekFromNow;
    }).length;

    const dueNextWeek = pendingTasks.filter((t) => {
      const d = new Date(t.start_date);
      return d > oneWeekFromNow && d <= twoWeeksFromNow;
    }).length;

    return { dueThisWeek, dueNextWeek };
  }, [isTourMode, demoData, prodTasks]);

  // Loading state
  const loading = isTourMode ? false : (loadingInventory || loadingEmployees || loadingRequirements || loadingTasks);

  // Compute asset stats
  const assetStats = useMemo((): AssetStats => {
    const total = inventoryItems.length;
    let available = 0;
    let inUse = 0;
    let underService = 0;
    let lowStock = 0;
    let criticalStock = 0;

    inventoryItems.forEach(item => {
      const status = classifyAssetStatus(item.status_item);
      switch (status) {
        case 'available':
          available++;
          break;
        case 'inUse':
          inUse++;
          break;
        case 'underService':
          underService++;
          break;
      }

      // Check stock thresholds
      const qty = item.quantity_available ?? 0;
      const criticalThreshold = item.critical_stock_threshold ?? 0;
      const lowThreshold = item.low_stock_threshold ?? 0;

      // Critical takes precedence over low
      if (criticalThreshold > 0 && qty <= criticalThreshold) {
        criticalStock++;
      } else if (lowThreshold > 0 && qty <= lowThreshold) {
        lowStock++;
      }
    });

    return { total, available, inUse, underService, lowStock, criticalStock };
  }, [inventoryItems]);

  // Compute team stats
  const teamStats = useMemo((): TeamStats => {
    const total = employees.length;
    let compliant = 0;
    let expiringSoon = 0;
    let incomplete = 0;
    let hasAnyCredentials = false;

    employees.forEach(emp => {
      const stats = emp.requirements_stats || {};
      
      // Check if this employee has any credentials assigned
      if (stats.total > 0) {
        hasAnyCredentials = true;
        
        if (stats.missing_expired === 0 && stats.expiring_soon === 0) {
          compliant++;
        }
        if (stats.expiring_soon > 0) {
          expiringSoon++;
        }
        if (stats.missing_expired > 0) {
          incomplete++;
        }
      }
    });

    return { 
      total, 
      compliant: hasAnyCredentials ? compliant : 0, 
      expiringSoon, 
      incomplete,
    };
  }, [employees]);

  return {
    assets: assetStats,
    team: teamStats,
    credentials: credentialStats,
    maintenance: taskStats,
    loading,
    isUsingDemoFallback: isTourMode,
  };
};

/**
 * Get assets that are currently "In Use"
 */
export const useInUseAssets = () => {
  const { isTourMode } = useTourMode();
  const demoData = useDemoDataOptional();
  const { items: prodItems, loading: prodLoading } = useCacheInventory();

  const { inUseItems, loading, count } = useMemo(() => {
    if (isTourMode && demoData) {
      const items = demoData.assets.filter(item => classifyAssetStatus(item.status_item) === 'inUse');
      return { inUseItems: items, loading: false, count: items.length };
    }
    const items = prodItems.filter(item => classifyAssetStatus(item.status_item) === 'inUse');
    return { inUseItems: items, loading: prodLoading, count: items.length };
  }, [isTourMode, demoData, prodItems, prodLoading]);

  return { inUseItems, loading, count };
};

/**
 * Get items with low or critical stock levels
 */
export const useLowStockItems = () => {
  const { isTourMode } = useTourMode();
  const demoData = useDemoDataOptional();
  const { items: prodItems, loading: prodLoading } = useCacheInventory();

  const { lowStockItems, criticalStockItems, loading } = useMemo(() => {
    const items = isTourMode && demoData ? demoData.assets : prodItems;
    const low: typeof items = [];
    const critical: typeof items = [];

    items.forEach(item => {
      const qty = item.quantity_available ?? 0;
      const criticalThreshold = item.critical_stock_threshold ?? 0;
      const lowThreshold = item.low_stock_threshold ?? 0;

      if (criticalThreshold > 0 && qty <= criticalThreshold) {
        critical.push(item);
      } else if (lowThreshold > 0 && qty <= lowThreshold) {
        low.push(item);
      }
    });

    return { 
      lowStockItems: low, 
      criticalStockItems: critical, 
      loading: isTourMode ? false : prodLoading 
    };
  }, [isTourMode, demoData, prodItems, prodLoading]);

  return { lowStockItems, criticalStockItems, loading };
};
