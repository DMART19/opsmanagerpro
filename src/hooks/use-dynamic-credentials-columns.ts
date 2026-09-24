import { useMemo, useState, useEffect, useCallback } from "react";

export type ColumnPriority = 1 | 2 | 3 | 4 | 5; // 1 = highest priority (always visible)

export interface CredentialColumn {
  id: string;
  label: string;
  priority: ColumnPriority;
  accessor: (requirement: any) => any;
  hasData: boolean;
  isRequired?: boolean; // If true, always show regardless of data
  isCustomAttribute?: boolean;
  attributeId?: string;
  width?: string;
  align?: "left" | "center" | "right";
}

interface UseDynamicCredentialsColumnsOptions {
  requirements: any[];
}

const STORAGE_KEY = "credentials-visible-columns";

/**
 * Check if a value is considered "empty" for column visibility purposes
 */
const isEmptyValue = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (typeof value === "boolean") return false; // Booleans are valid values
  if (typeof value === "number" && value === 0) return true; // Zeros count as empty for stats
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

/**
 * Dynamic Credentials Columns Hook
 * 
 * Core Rules:
 * 1. Required columns (Title, Status, Actions) are ALWAYS visible
 * 2. Optional columns only show if at least ONE credential has data
 * 3. Columns are hidden automatically if all values are empty
 * 4. User preferences are persisted but filtered by data availability
 * 5. Responsive behavior prioritizes higher-priority columns
 */
export const useDynamicCredentialsColumns = ({ 
  requirements,
}: UseDynamicCredentialsColumnsOptions) => {

  // Define core columns with priorities and data checks
  const coreColumns = useMemo((): CredentialColumn[] => {
    // Title column - ALWAYS visible (required)
    const titleColumn: CredentialColumn = {
      id: "title",
      label: "Title",
      priority: 1,
      accessor: (req) => req.title,
      hasData: true, // Always has data
      isRequired: true,
      width: "min-w-[200px]",
      align: "left",
    };

    // Type column - show if any credential has a type
    const typeHasData = requirements.some(
      (req) => req.requirement_type && req.requirement_type.trim() !== ""
    );

    const typeColumn: CredentialColumn = {
      id: "type",
      label: "Type",
      priority: 3,
      accessor: (req) => req.requirement_type || null,
      hasData: typeHasData,
      align: "left",
    };

    // Total column - show if any credential has assignments
    const totalHasData = requirements.some((req) => (req.xTOTotal || 0) > 0);
    const totalColumn: CredentialColumn = {
      id: "total",
      label: "Total",
      priority: 3,
      accessor: (req) => req.xTOTotal || 0,
      hasData: totalHasData,
      align: "center",
    };

    // Current column - show if any credential has current/compliant count
    const currentHasData = requirements.some((req) => (req.xCurrentTotal || 0) > 0);
    const currentColumn: CredentialColumn = {
      id: "current",
      label: "Current",
      priority: 3,
      accessor: (req) => req.xCurrentTotal || 0,
      hasData: currentHasData,
      align: "center",
    };

    // Expired column - show if any credential has expired count
    const expiredHasData = requirements.some((req) => (req.xExpiredTotal || 0) > 0);
    const expiredColumn: CredentialColumn = {
      id: "expired",
      label: "Expired",
      priority: 2, // Higher priority - important status
      accessor: (req) => req.xExpiredTotal || 0,
      hasData: expiredHasData,
      align: "center",
    };

    // Missing column - show if any credential has missing count
    const missingHasData = requirements.some((req) => (req.xMissingTotal || 0) > 0);
    const missingColumn: CredentialColumn = {
      id: "missing",
      label: "Missing",
      priority: 2, // Higher priority - important status
      accessor: (req) => req.xMissingTotal || 0,
      hasData: missingHasData,
      align: "center",
    };

    // Sort column - show if any credential has a sort key
    const sortHasData = requirements.some(
      (req) => req.sort_key !== null && req.sort_key !== undefined
    );
    const sortColumn: CredentialColumn = {
      id: "sort",
      label: "Sort",
      priority: 5, // Lowest priority
      accessor: (req) => req.sort_key,
      hasData: sortHasData,
      align: "center",
    };

    // Renewal cycle column - show if any credential has expiration settings
    const renewalHasData = requirements.some(
      (req) => req.renewal_cycle_months && req.renewal_cycle_months > 0
    );
    const renewalColumn: CredentialColumn = {
      id: "renewal",
      label: "Validity",
      priority: 4,
      accessor: (req) => {
        if (!req.renewal_cycle_months) return null;
        const months = req.renewal_cycle_months;
        if (months === 12) return "Annual";
        if (months === 24) return "2 years";
        if (months === 36) return "3 years";
        if (months % 12 === 0) return `${months / 12} years`;
        return `${months} months`;
      },
      hasData: renewalHasData,
      align: "left",
    };

    // Active column - ALWAYS visible (required for table operability)
    const activeColumn: CredentialColumn = {
      id: "active",
      label: "Active",
      priority: 2,
      accessor: (req) => req.is_active,
      hasData: true,
      isRequired: true,
      align: "center",
    };

    // Actions column - ALWAYS visible (required)
    const actionsColumn: CredentialColumn = {
      id: "actions",
      label: "Actions",
      priority: 1,
      accessor: () => null,
      hasData: true,
      isRequired: true,
      width: "w-24",
      align: "center",
    };

    return [
      titleColumn,
      typeColumn,
      totalColumn,
      currentColumn,
      expiredColumn,
      missingColumn,
      renewalColumn,
      sortColumn,
      activeColumn,
      actionsColumn,
    ];
  }, [requirements]);

  // Build custom attribute columns from requirement custom_data
  const customAttributeColumns = useMemo((): CredentialColumn[] => {
    // Collect all unique custom attribute keys across requirements
    const customKeys = new Set<string>();
    
    requirements.forEach((req) => {
      if (req.custom_data && typeof req.custom_data === "object") {
        Object.keys(req.custom_data).forEach((key) => {
          if (!isEmptyValue(req.custom_data[key])) {
            customKeys.add(key);
          }
        });
      }
    });

    return Array.from(customKeys).map((key) => ({
      id: `custom_${key}`,
      label: key,
      priority: 5 as ColumnPriority,
      accessor: (req) => req.custom_data?.[key] || null,
      hasData: true, // Already filtered to only keys with data
      isCustomAttribute: true,
      attributeId: key,
      align: "left" as const,
    }));
  }, [requirements]);

  // All columns combined
  const allColumns = useMemo((): CredentialColumn[] => {
    return [...coreColumns, ...customAttributeColumns];
  }, [coreColumns, customAttributeColumns]);

  // CRITICAL: Only columns that actually have data
  const columnsWithData = useMemo(() => {
    return allColumns.filter((col) => col.hasData || col.isRequired);
  }, [allColumns]);

  // Load persisted visibility preferences
  const [userToggledColumns, setUserToggledColumns] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (e) {
      // Ignore parse errors
    }
    return new Set<string>();
  });

  // Effective visible columns = columns with data that user hasn't hidden
  const visibleColumnIds = useMemo(() => {
    const visible = new Set<string>();
    
    columnsWithData.forEach((col) => {
      // Required columns are always visible
      if (col.isRequired) {
        visible.add(col.id);
        return;
      }
      
      // If user has explicitly toggled columns, respect that
      // Otherwise show all columns with data
      if (userToggledColumns.size === 0 || userToggledColumns.has(col.id)) {
        visible.add(col.id);
      }
    });
    
    return visible;
  }, [columnsWithData, userToggledColumns]);

  // Persist visibility preferences
  useEffect(() => {
    if (userToggledColumns.size > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...userToggledColumns]));
    }
  }, [userToggledColumns]);

  // Get responsive visible columns based on screen size and priority
  const getResponsiveColumns = useCallback((maxColumns?: number): CredentialColumn[] => {
    // ONLY include columns that have data AND are visible
    let visible = columnsWithData.filter((col) => visibleColumnIds.has(col.id));

    // Sort by priority (lower number = higher priority)
    visible = visible.sort((a, b) => a.priority - b.priority);

    // Apply max columns limit if specified
    if (maxColumns !== undefined && visible.length > maxColumns) {
      // Always keep required columns
      const required = visible.filter(c => c.isRequired);
      const optional = visible.filter(c => !c.isRequired).slice(0, maxColumns - required.length);
      visible = [...required, ...optional];
    }

    // Re-sort to maintain original order
    const orderMap = new Map(allColumns.map((c, i) => [c.id, i]));
    visible = visible.sort((a, b) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0));

    return visible;
  }, [allColumns, columnsWithData, visibleColumnIds]);

  // Toggle column visibility
  const toggleColumn = useCallback((columnId: string) => {
    // Required columns cannot be toggled
    const column = allColumns.find(c => c.id === columnId);
    if (column?.isRequired) return;

    setUserToggledColumns((prev) => {
      const next = new Set(prev);
      
      // If this is the first toggle, initialize with all current visible columns
      if (prev.size === 0) {
        columnsWithData.forEach(c => next.add(c.id));
      }
      
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, [allColumns, columnsWithData]);

  // Show all columns with data
  const showAllColumns = useCallback(() => {
    setUserToggledColumns(new Set(columnsWithData.map((c) => c.id)));
  }, [columnsWithData]);

  // Reset to default (priority-based)
  const showDefaultColumns = useCallback(() => {
    const defaults = columnsWithData
      .filter((c) => c.isRequired || c.priority <= 3)
      .map((c) => c.id);
    setUserToggledColumns(new Set(defaults));
  }, [columnsWithData]);

  // Count hidden columns that have data
  const hiddenColumnsCount = useMemo(() => {
    return columnsWithData.filter((col) => !visibleColumnIds.has(col.id)).length;
  }, [columnsWithData, visibleColumnIds]);

  return {
    allColumns,
    columnsWithData,
    visibleColumnIds,
    toggleColumn,
    showAllColumns,
    showDefaultColumns,
    getResponsiveColumns,
    hiddenColumnsCount,
    hasHiddenColumns: hiddenColumnsCount > 0,
  };
};
