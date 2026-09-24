import { useMemo, useState, useEffect, useCallback } from "react";
import { useTeamMemberAttributes } from "./use-team-member-attributes";

export type ColumnPriority = 1 | 2 | 3 | 4 | 5; // 1 = highest (always visible)

export interface DynamicColumn {
  id: string;
  label: string;
  priority: ColumnPriority;
  accessor: (employee: any) => any;
  hasData: boolean;
  isRequired?: boolean; // If true, always show regardless of data
  isCustomAttribute?: boolean;
  attributeId?: string;
  width?: string;
}

interface UseDynamicTeamColumnsOptions {
  employees: any[];
  customAttributeValues?: Record<string, Record<string, string | null>>;
}

const STORAGE_KEY = "team-visible-columns";

/**
 * Check if a value is considered "empty" for column visibility purposes
 */
const isEmptyValue = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (typeof value === "boolean") return false; // Booleans are valid values
  if (typeof value === "number") return false; // Numbers are always valid
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

/**
 * Dynamic Team Columns Hook
 * 
 * Core Rules:
 * 1. Required columns (Name, Actions) are ALWAYS visible
 * 2. Optional columns only show if at least ONE row has data
 * 3. Columns are hidden automatically if all values are empty
 * 4. User preferences are persisted but filtered by data availability
 * 5. Responsive behavior prioritizes higher-priority columns
 */
export const useDynamicTeamColumns = ({ 
  employees,
  customAttributeValues = {},
}: UseDynamicTeamColumnsOptions) => {
  const { attributes } = useTeamMemberAttributes();

  // Check if a column has any data across all employees
  const checkColumnHasData = useCallback((accessor: (emp: any) => any): boolean => {
    return employees.some((emp) => {
      const value = accessor(emp);
      return !isEmptyValue(value);
    });
  }, [employees]);

  // Define core columns with priorities and data checks
  const coreColumns = useMemo((): DynamicColumn[] => {
    // Name column - ALWAYS visible (required)
    const nameColumn: DynamicColumn = {
      id: "name",
      label: "Name",
      priority: 1,
      accessor: (emp) => `${emp.first_name} ${emp.last_name}`,
      hasData: true, // Always has data
      isRequired: true,
      width: "min-w-[200px]",
    };

    // Role/Position column - show if any employee has role or position
    const roleHasData = employees.some((emp) => 
      (emp.team_role?.name && emp.team_role.name.trim() !== "") || 
      (emp.position && emp.position.trim() !== "")
    );

    const roleColumn: DynamicColumn = {
      id: "role",
      label: "Role / Position",
      priority: 2,
      accessor: (emp) => emp.team_role?.name || emp.position || null,
      hasData: roleHasData,
    };

    // Department column - show if any employee has department
    const departmentHasData = employees.some((emp) => 
      emp.department && emp.department.trim() !== ""
    );

    const departmentColumn: DynamicColumn = {
      id: "department",
      label: "Department",
      priority: 3,
      accessor: (emp) => emp.department || null,
      hasData: departmentHasData,
    };

    // Credential Status badge column - show if any employee has credential assignments
    const credentialStatusHasData = employees.some((emp) => {
      const stats = emp.requirements_stats;
      return stats && stats.total > 0;
    });

    const credentialStatusColumn: DynamicColumn = {
      id: "credential_status",
      label: "Credential Status",
      priority: 2,
      accessor: (emp) => {
        const stats = emp.requirements_stats;
        if (!stats || stats.total === 0) return "none";
        if (stats.missing_expired > 0) return "action_required";
        if (stats.expiring_soon > 0) return "expiring_soon";
        return "up_to_date";
      },
      hasData: credentialStatusHasData,
      width: "w-[160px]",
    };

    // Credential summary column (✔ 3 ⚠ 1 ✖ 2)
    const credentialSummaryColumn: DynamicColumn = {
      id: "credential_summary",
      label: "Credentials",
      priority: 2,
      accessor: (emp) => {
        const stats = emp.requirements_stats;
        if (!stats || stats.total === 0) return null;
        return stats;
      },
      hasData: credentialStatusHasData,
      width: "w-[140px]",
    };

    // Expiring Soon count column
    const expiringSoonColumn: DynamicColumn = {
      id: "expiring_soon",
      label: "Expiring Soon",
      priority: 4,
      accessor: (emp) => {
        const stats = emp.requirements_stats;
        return stats?.expiring_soon || 0;
      },
      hasData: credentialStatusHasData,
      width: "w-[120px]",
    };

    // Action Required count column
    const actionRequiredColumn: DynamicColumn = {
      id: "action_required",
      label: "Action Required",
      priority: 4,
      accessor: (emp) => {
        const stats = emp.requirements_stats;
        return stats?.missing_expired || 0;
      },
      hasData: credentialStatusHasData,
      width: "w-[130px]",
    };

    return [nameColumn, roleColumn, departmentColumn, credentialStatusColumn, credentialSummaryColumn, expiringSoonColumn, actionRequiredColumn];
  }, [employees]);

  // Build custom attribute columns - only include if data exists
  const customAttributeColumns: DynamicColumn[] = useMemo(() => {
    return attributes.map((attr) => {
      // Check if any employee has a value for this attribute
      const hasData = employees.some((emp) => {
        // Check in customAttributeValues map first
        const values = customAttributeValues[emp.id];
        if (values) {
          // Check by attribute ID
          if (!isEmptyValue(values[attr.id])) return true;
          // Also check by attribute name (for compatibility)
          if (!isEmptyValue(values[attr.name])) return true;
        }
        // Check in custom_data field directly
        if (emp.custom_data) {
          if (!isEmptyValue(emp.custom_data[attr.id])) return true;
          if (!isEmptyValue(emp.custom_data[attr.name])) return true;
        }
        return false;
      });

      return {
        id: `custom_${attr.id}`,
        label: attr.name,
        priority: 5 as ColumnPriority, // Custom attributes get lowest priority
        accessor: (emp) => {
          const values = customAttributeValues[emp.id];
          if (values) {
            return values[attr.id] || values[attr.name] || null;
          }
          if (emp.custom_data) {
            return emp.custom_data[attr.id] || emp.custom_data[attr.name] || null;
          }
          return null;
        },
        hasData,
        isCustomAttribute: true,
        attributeId: attr.id,
      };
    });
  }, [attributes, employees, customAttributeValues]);

  // All columns combined
  const allColumns: DynamicColumn[] = useMemo(() => {
    return [...coreColumns, ...customAttributeColumns];
  }, [coreColumns, customAttributeColumns]);

  // CRITICAL: Only columns that actually have data
  const columnsWithData = useMemo(() => {
    return allColumns.filter((col) => col.hasData || col.isRequired);
  }, [allColumns]);

  // Get IDs of columns that currently have data
  const columnsWithDataIds = useMemo(() => {
    return new Set(columnsWithData.map(c => c.id));
  }, [columnsWithData]);

  // Load persisted visibility preferences
  const [userToggledColumns, setUserToggledColumns] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(parsed);
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
  const getResponsiveColumns = useCallback((maxColumns?: number): DynamicColumn[] => {
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

    return visible;
  }, [columnsWithData, visibleColumnIds]);

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

  // Reset to default (priority-based, only showing columns with data)
  const showDefaultColumns = useCallback(() => {
    const defaults = columnsWithData
      .filter((c) => c.isRequired || c.priority <= 3)
      .map((c) => c.id);
    setUserToggledColumns(new Set(defaults));
  }, [columnsWithData]);

  // Calculate responsive column count based on screen width
  const getMaxColumnsForScreen = useCallback((): number | undefined => {
    if (typeof window === "undefined") return undefined;
    
    const width = window.innerWidth;
    if (width < 768) return 2; // Mobile: Name + one other
    if (width < 1024) return 4; // Tablet
    if (width < 1280) return 5; // Small desktop
    return undefined; // Large desktop: show all
  }, []);

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
    getMaxColumnsForScreen,
    hiddenColumnsCount,
    customAttributes: attributes,
    hasCustomAttributes: attributes.length > 0,
  };
};
