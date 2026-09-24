import { useMemo, useCallback } from "react";
import { normalizeFieldValue } from "@/lib/normalize";
import { useTeamMemberAttributes, TeamMemberAttribute } from "./use-team-member-attributes";

export type FilterType = "select" | "multiselect" | "text" | "boolean" | "date-range";

export interface DynamicFilter {
  id: string;
  label: string;
  type: FilterType;
  options?: string[];
  hasData: boolean;
  isCore?: boolean;
  isCustomAttribute?: boolean;
  attributeId?: string;
  priority: number; // Lower = higher priority (shown first)
}

export interface DynamicFiltersState {
  [key: string]: string | string[] | boolean | null;
}

interface UseDynamicTeamFiltersOptions {
  employees: any[];
}

/**
 * Helper to check if a value is empty
 */
const isEmptyValue = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
};

/**
 * Dynamic Team Filters Hook
 * 
 * Core Rules:
 * 1. Filters only appear if at least one employee has data for that field
 * 2. Custom attributes become filters automatically when they have data
 * 3. Filter types are auto-detected based on data/attribute type
 * 4. Filters mirror table column visibility
 */
export const useDynamicTeamFilters = ({ employees }: UseDynamicTeamFiltersOptions) => {
  const { attributes } = useTeamMemberAttributes();

  // Extract unique values from employees for a given accessor
  const getUniqueValues = useCallback((accessor: (emp: any) => any): string[] => {
    const values = new Set<string>();
    employees.forEach((emp) => {
      const value = accessor(emp);
      if (!isEmptyValue(value)) {
        if (Array.isArray(value)) {
          value.forEach((v) => values.add(String(v)));
        } else {
          values.add(String(value));
        }
      }
    });
    return Array.from(values).sort();
  }, [employees]);

  // Check if any employee has data for a field
  const hasDataForField = useCallback((accessor: (emp: any) => any): boolean => {
    return employees.some((emp) => !isEmptyValue(accessor(emp)));
  }, [employees]);

  // Build core filters dynamically based on data
  const coreFilters = useMemo((): DynamicFilter[] => {
    const filters: DynamicFilter[] = [];

    // Status filter - always available (core system concept)
    const statusValues = getUniqueValues((emp) => emp.status);
    if (statusValues.length > 0) {
      filters.push({
        id: "status",
        label: "Status",
        type: "select",
        options: statusValues,
        hasData: true,
        isCore: true,
        priority: 1,
      });
    }

    // Department filter - only if departments exist
    const departmentValues = getUniqueValues((emp) => emp.department);
    if (departmentValues.length > 0) {
      filters.push({
        id: "department",
        label: "Department",
        type: "select",
        options: departmentValues,
        hasData: true,
        isCore: true,
        priority: 2,
      });
    }

    // Role/Position filter - only if roles or positions exist
    const roleValues = getUniqueValues((emp) => emp.team_role?.name);
    const positionValues = getUniqueValues((emp) => emp.position);
    const combinedRoleValues = [...new Set([...roleValues, ...positionValues])].sort();
    
    if (combinedRoleValues.length > 0) {
      filters.push({
        id: "role",
        label: "Role / Position",
        type: "select",
        options: combinedRoleValues,
        hasData: true,
        isCore: true,
        priority: 3,
      });
    }

    // Credential Status filter - only if any employee has credential data
    const hasCredentialData = employees.some((emp) => {
      const stats = emp.requirements_stats;
      return stats && stats.total > 0;
    });

    if (hasCredentialData) {
      filters.push({
        id: "credentialStatus",
        label: "Credential Status",
        type: "select",
        options: ["All Complete", "Expiring Soon", "Incomplete"],
        hasData: true,
        isCore: true,
        priority: 4,
      });
    }

    // Hire Date filter - only if hire dates exist
    const hasHireDates = hasDataForField((emp) => emp.hire_date);
    if (hasHireDates) {
      filters.push({
        id: "hireDateRange",
        label: "Hire Date",
        type: "select",
        options: ["Last 30 Days", "Last 90 Days", "Last Year", "Over 1 Year", "Over 5 Years"],
        hasData: true,
        isCore: true,
        priority: 10, // Lower priority - goes in "More Filters"
      });
    }

    return filters;
  }, [employees, getUniqueValues, hasDataForField]);

  // Build custom attribute filters based on data availability
  const customAttributeFilters = useMemo((): DynamicFilter[] => {
    return attributes
      .map((attr): DynamicFilter | null => {
        // Check if any employee has a value for this attribute
        const hasData = employees.some((emp) => {
          if (emp.custom_data) {
            const value = emp.custom_data[attr.id] || emp.custom_data[attr.name];
            return !isEmptyValue(value);
          }
          return false;
        });

        // Don't create filter if no data exists
        if (!hasData) return null;

        // Get unique values for this attribute
        const values = getUniqueValues((emp) => {
          if (emp.custom_data) {
            return emp.custom_data[attr.id] || emp.custom_data[attr.name];
          }
          return null;
        });

        // Determine filter type based on attribute type
        let filterType: FilterType = "select";
        let options: string[] | undefined = values;

        switch (attr.type) {
          case "boolean":
            filterType = "boolean";
            options = undefined;
            break;
          case "date":
            filterType = "date-range";
            options = undefined;
            break;
          case "number":
            // For numbers, use text search (range could be added later)
            filterType = "text";
            options = undefined;
            break;
          case "select":
            filterType = "select";
            options = attr.options || values;
            break;
          case "text":
          default:
            // If there are few unique values, use select; otherwise text
            if (values.length <= 10) {
              filterType = "select";
              options = values;
            } else {
              filterType = "text";
              options = undefined;
            }
            break;
        }

        return {
          id: `custom_${attr.id}`,
          label: attr.name,
          type: filterType,
          options,
          hasData: true,
          isCustomAttribute: true,
          attributeId: attr.id,
          priority: 20 + attr.sort_order, // Custom attributes come after core filters
        };
      })
      .filter((f): f is DynamicFilter => f !== null);
  }, [attributes, employees, getUniqueValues]);

  // Combine all filters
  const allFilters = useMemo((): DynamicFilter[] => {
    return [...coreFilters, ...customAttributeFilters].sort((a, b) => a.priority - b.priority);
  }, [coreFilters, customAttributeFilters]);

  // Primary filters (shown inline) - priority <= 5
  const primaryFilters = useMemo(() => {
    return allFilters.filter((f) => f.priority <= 5);
  }, [allFilters]);

  // Secondary filters (shown in "More Filters") - priority > 5
  const secondaryFilters = useMemo(() => {
    return allFilters.filter((f) => f.priority > 5);
  }, [allFilters]);

  // Apply filters to employees
  const applyFilters = useCallback((
    employeeList: any[],
    filterState: DynamicFiltersState,
    searchQuery: string
  ): any[] => {
    return employeeList.filter((emp) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const queryNorm = normalizeFieldValue(searchQuery);
        const matchField = (val: string | null | undefined) => {
          if (!val) return false;
          const lower = val.toLowerCase();
          if (lower.includes(query)) return true;
          if (queryNorm && normalizeFieldValue(val).includes(queryNorm)) return true;
          return false;
        };
        const fullName = `${emp.first_name} ${emp.last_name}`;
        const tagsMatch = emp.tags?.some((tag: string) => matchField(tag));
        const matchesSearch =
          matchField(fullName) ||
          matchField(emp.position) ||
          matchField(emp.employee_id) ||
          matchField(emp.email) ||
          matchField(emp.department) ||
          tagsMatch;
        
        if (!matchesSearch) return false;
      }

      // Apply each active filter
      for (const filter of allFilters) {
        const filterValue = filterState[filter.id];
        
        // Skip if filter is not set or is "all"
        if (filterValue === null || filterValue === undefined || filterValue === "all") {
          continue;
        }

        // Handle core filters
        switch (filter.id) {
          case "status":
            if (filterValue && emp.status !== filterValue) return false;
            break;
          
          case "department":
            if (filterValue && emp.department !== filterValue) return false;
            break;
          
          case "role":
            if (filterValue) {
              const empRole = emp.team_role?.name || emp.position;
              if (empRole !== filterValue) return false;
            }
            break;
          
          case "credentialStatus":
            if (filterValue) {
              const stats = emp.requirements_stats || {};
              switch (filterValue) {
                case "All Complete":
                  if (stats.missing_expired > 0 || stats.expiring_soon > 0) return false;
                  break;
                case "Expiring Soon":
                  if (!stats.expiring_soon || stats.expiring_soon === 0) return false;
                  break;
                case "Incomplete":
                  if (!stats.missing_expired || stats.missing_expired === 0) return false;
                  break;
              }
            }
            break;
          
          case "hireDateRange":
            if (filterValue && emp.hire_date) {
              const hireDate = new Date(emp.hire_date);
              const now = new Date();
              const daysAgo = Math.floor((now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));
              
              switch (filterValue) {
                case "Last 30 Days":
                  if (daysAgo > 30) return false;
                  break;
                case "Last 90 Days":
                  if (daysAgo > 90) return false;
                  break;
                case "Last Year":
                  if (daysAgo > 365) return false;
                  break;
                case "Over 1 Year":
                  if (daysAgo <= 365) return false;
                  break;
                case "Over 5 Years":
                  if (daysAgo <= 365 * 5) return false;
                  break;
              }
            }
            break;
          
          default:
            // Handle custom attribute filters
            if (filter.isCustomAttribute && filter.attributeId) {
              const empValue = emp.custom_data?.[filter.attributeId] || 
                               emp.custom_data?.[filter.label];
              
              if (filter.type === "boolean") {
                const boolFilter = filterValue === true || filterValue === "true";
                const empBool = empValue === true || empValue === "true";
                if (boolFilter !== empBool) return false;
              } else if (filter.type === "text") {
                if (filterValue && typeof filterValue === "string") {
                  if (!empValue) return false;
                  const lower = empValue.toLowerCase();
                  const query = filterValue.toLowerCase();
                  if (!lower.includes(query) && !normalizeFieldValue(empValue).includes(normalizeFieldValue(filterValue))) {
                    return false;
                  }
                }
              } else {
                if (filterValue && empValue !== filterValue) return false;
              }
            }
            break;
        }
      }

      return true;
    });
  }, [allFilters]);

  // Get default filter state
  const getDefaultFilterState = useCallback((): DynamicFiltersState => {
    const state: DynamicFiltersState = {};
    allFilters.forEach((f) => {
      state[f.id] = "all";
    });
    return state;
  }, [allFilters]);

  // Count active filters
  const countActiveFilters = useCallback((filterState: DynamicFiltersState): number => {
    return Object.entries(filterState).filter(([key, value]) => {
      return value !== null && value !== undefined && value !== "all" && value !== "";
    }).length;
  }, []);

  return {
    allFilters,
    primaryFilters,
    secondaryFilters,
    applyFilters,
    getDefaultFilterState,
    countActiveFilters,
    hasFiltersAvailable: allFilters.length > 0,
    customAttributes: attributes,
  };
};
