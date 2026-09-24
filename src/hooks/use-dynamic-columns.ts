import { useMemo, useState, useEffect, useCallback } from "react";

/**
 * Global column visibility configuration
 * Priority: 1 = always visible (required), 2-5 = optional based on screen size
 */
export type ColumnPriority = 1 | 2 | 3 | 4 | 5;

export interface ColumnDefinition<T = any> {
  id: string;
  label: string;
  priority: ColumnPriority;
  accessor: (item: T) => any;
  required?: boolean; // If true, always visible regardless of data
  width?: string;
  align?: "left" | "center" | "right";
}

export interface DynamicColumnResult<T = any> extends ColumnDefinition<T> {
  hasData: boolean;
}

interface UseDynamicColumnsOptions<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  storageKey?: string;
}

/**
 * Check if a value is considered "empty" for column visibility purposes
 */
const isEmptyValue = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
};

/**
 * Global utility hook for dynamic column visibility
 * 
 * Rules:
 * 1. Required columns are always visible
 * 2. Optional columns only show if at least one row has data
 * 3. Columns are hidden automatically if all values are empty
 * 4. User preferences are persisted in localStorage
 * 5. Responsive behavior prioritizes higher-priority columns
 */
export const useDynamicColumns = <T>({
  data,
  columns,
  storageKey,
}: UseDynamicColumnsOptions<T>) => {
  
  // Determine which columns have data
  const columnsWithDataInfo = useMemo((): DynamicColumnResult<T>[] => {
    return columns.map((col) => {
      // Required columns always "have data"
      if (col.required) {
        return { ...col, hasData: true };
      }
      
      // Check if any row has non-empty data for this column
      const hasData = data.some((item) => {
        const value = col.accessor(item);
        return !isEmptyValue(value);
      });
      
      return { ...col, hasData };
    });
  }, [data, columns]);

  // Filter to only columns with data
  const columnsWithData = useMemo(() => {
    return columnsWithDataInfo.filter((col) => col.hasData);
  }, [columnsWithDataInfo]);

  // User visibility preferences (persisted)
  const [userVisibleIds, setUserVisibleIds] = useState<Set<string>>(() => {
    if (!storageKey) {
      return new Set(columnsWithData.map((c) => c.id));
    }
    
    try {
      const stored = localStorage.getItem(`columns_${storageKey}`);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (e) {
      // Ignore parse errors
    }
    return new Set(columnsWithData.map((c) => c.id));
  });

  // Sync with data changes - add new columns that have data
  useEffect(() => {
    setUserVisibleIds((prev) => {
      const next = new Set(prev);
      
      // Always ensure required columns are visible
      columnsWithData.forEach((col) => {
        if (col.required) {
          next.add(col.id);
        }
      });
      
      // For columns that just got data and weren't explicitly hidden
      columnsWithData.forEach((col) => {
        if (col.hasData && !prev.has(col.id)) {
          // Check if this is a newly populated column
          const wasEmpty = columnsWithDataInfo.find(c => c.id === col.id);
          if (wasEmpty && wasEmpty.hasData) {
            next.add(col.id);
          }
        }
      });
      
      return next;
    });
  }, [columnsWithData, columnsWithDataInfo]);

  // Persist preferences
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(`columns_${storageKey}`, JSON.stringify([...userVisibleIds]));
    }
  }, [userVisibleIds, storageKey]);

  // Get visible columns (with data AND user-selected)
  const visibleColumns = useMemo(() => {
    return columnsWithData.filter((col) => userVisibleIds.has(col.id));
  }, [columnsWithData, userVisibleIds]);

  // Get responsive columns based on max count
  const getResponsiveColumns = useCallback((maxColumns?: number): DynamicColumnResult<T>[] => {
    let visible = [...visibleColumns].sort((a, b) => a.priority - b.priority);
    
    if (maxColumns !== undefined && visible.length > maxColumns) {
      visible = visible.slice(0, maxColumns);
    }
    
    return visible;
  }, [visibleColumns]);

  // Calculate max columns based on screen width
  const getMaxColumnsForWidth = useCallback((width: number): number | undefined => {
    if (width < 640) return 2;   // Mobile
    if (width < 768) return 3;   // Small tablet
    if (width < 1024) return 4;  // Tablet
    if (width < 1280) return 6;  // Small desktop
    return undefined;            // Large desktop - no limit
  }, []);

  // Toggle column visibility
  const toggleColumn = useCallback((columnId: string) => {
    const column = columns.find((c) => c.id === columnId);
    if (column?.required) return; // Can't toggle required columns
    
    setUserVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, [columns]);

  // Show all columns with data
  const showAllColumns = useCallback(() => {
    setUserVisibleIds(new Set(columnsWithData.map((c) => c.id)));
  }, [columnsWithData]);

  // Reset to defaults (required + priority 1-3)
  const resetToDefaults = useCallback(() => {
    const defaults = columnsWithData
      .filter((c) => c.required || c.priority <= 3)
      .map((c) => c.id);
    setUserVisibleIds(new Set(defaults));
  }, [columnsWithData]);

  // Count hidden columns that have data
  const hiddenColumnsCount = useMemo(() => {
    return columnsWithData.filter((col) => !userVisibleIds.has(col.id)).length;
  }, [columnsWithData, userVisibleIds]);

  // Check if a specific column is visible
  const isColumnVisible = useCallback((columnId: string): boolean => {
    const col = columnsWithData.find((c) => c.id === columnId);
    return col?.hasData === true && userVisibleIds.has(columnId);
  }, [columnsWithData, userVisibleIds]);

  return {
    // All column definitions with data status
    allColumns: columnsWithDataInfo,
    // Only columns that have data
    columnsWithData,
    // Currently visible columns (have data + user selected)
    visibleColumns,
    // User-selected column IDs
    userVisibleIds,
    // Functions
    toggleColumn,
    showAllColumns,
    resetToDefaults,
    getResponsiveColumns,
    getMaxColumnsForWidth,
    isColumnVisible,
    // Stats
    hiddenColumnsCount,
    hasHiddenColumns: hiddenColumnsCount > 0,
  };
};

/**
 * Hook for responsive column count based on window width
 */
export const useResponsiveColumnCount = () => {
  const [maxColumns, setMaxColumns] = useState<number | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return getMaxColumnsForWidth(window.innerWidth);
  });

  useEffect(() => {
    const handleResize = () => {
      setMaxColumns(getMaxColumnsForWidth(window.innerWidth));
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return maxColumns;
};

function getMaxColumnsForWidth(width: number): number | undefined {
  if (width < 640) return 2;
  if (width < 768) return 3;
  if (width < 1024) return 4;
  if (width < 1280) return 6;
  return undefined;
}
