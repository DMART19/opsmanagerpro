import { useState, useEffect } from "react";
import { 
  Settings2, 
  Columns, 
  LayoutList, 
  ChevronDown,
  Check,
  Rows3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ColumnConfig {
  key: string;
  label: string;
  defaultVisible?: boolean;
}

interface TableControlsProps {
  columns: ColumnConfig[];
  visibleColumns: string[];
  onVisibleColumnsChange: (columns: string[]) => void;
  density: "compact" | "comfortable";
  onDensityChange: (density: "compact" | "comfortable") => void;
  storageKey?: string; // For persisting preferences
}

/**
 * Table controls component for column visibility and density settings.
 * Preferences are persisted to localStorage if storageKey is provided.
 */
export const TableControls = ({
  columns,
  visibleColumns,
  onVisibleColumnsChange,
  density,
  onDensityChange,
  storageKey,
}: TableControlsProps) => {
  // Load preferences on mount
  useEffect(() => {
    if (!storageKey) return;

    const savedPrefs = localStorage.getItem(`table_prefs_${storageKey}`);
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        if (prefs.visibleColumns) {
          onVisibleColumnsChange(prefs.visibleColumns);
        }
        if (prefs.density) {
          onDensityChange(prefs.density);
        }
      } catch (e) {
        console.error("Failed to parse table preferences", e);
      }
    }
  }, [storageKey]);

  // Save preferences when changed
  useEffect(() => {
    if (!storageKey) return;

    const prefs = { visibleColumns, density };
    localStorage.setItem(`table_prefs_${storageKey}`, JSON.stringify(prefs));
  }, [storageKey, visibleColumns, density]);

  const toggleColumn = (key: string) => {
    if (visibleColumns.includes(key)) {
      // Prevent hiding all columns
      if (visibleColumns.length > 1) {
        onVisibleColumnsChange(visibleColumns.filter((c) => c !== key));
      }
    } else {
      onVisibleColumnsChange([...visibleColumns, key]);
    }
  };

  const showAllColumns = () => {
    onVisibleColumnsChange(columns.map((c) => c.key));
  };

  const hideOptionalColumns = () => {
    const defaultVisible = columns
      .filter((c) => c.defaultVisible !== false)
      .map((c) => c.key);
    onVisibleColumnsChange(defaultVisible);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Column Visibility */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <Columns className="h-4 w-4" />
            <span className="hidden sm:inline">Columns</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {columns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.key}
              checked={visibleColumns.includes(column.key)}
              onCheckedChange={() => toggleColumn(column.key)}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <div className="flex gap-1 p-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={showAllColumns}
            >
              Show All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={hideOptionalColumns}
            >
              Reset
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Density Control */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            {density === "compact" ? (
              <Rows3 className="h-4 w-4" />
            ) : (
              <LayoutList className="h-4 w-4" />
            )}
            <span className="hidden sm:inline capitalize">{density}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Row Density</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={density}
            onValueChange={(value) => onDensityChange(value as "compact" | "comfortable")}
          >
            <DropdownMenuRadioItem value="compact">
              <Rows3 className="h-4 w-4 mr-2" />
              Compact
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="comfortable">
              <LayoutList className="h-4 w-4 mr-2" />
              Comfortable
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

/**
 * Hook to manage table display preferences.
 * Returns state and setters for column visibility and density.
 */
export const useTablePreferences = (
  columns: ColumnConfig[],
  storageKey?: string
) => {
  const defaultVisible = columns
    .filter((c) => c.defaultVisible !== false)
    .map((c) => c.key);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultVisible);
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable");

  // Load preferences on mount
  useEffect(() => {
    if (!storageKey) return;

    const savedPrefs = localStorage.getItem(`table_prefs_${storageKey}`);
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        if (prefs.visibleColumns) {
          setVisibleColumns(prefs.visibleColumns);
        }
        if (prefs.density) {
          setDensity(prefs.density);
        }
      } catch (e) {
        console.error("Failed to parse table preferences", e);
      }
    }
  }, [storageKey]);

  // Save preferences when changed
  useEffect(() => {
    if (!storageKey) return;

    const prefs = { visibleColumns, density };
    localStorage.setItem(`table_prefs_${storageKey}`, JSON.stringify(prefs));
  }, [storageKey, visibleColumns, density]);

  const isColumnVisible = (key: string) => visibleColumns.includes(key);

  const getRowClassName = () => {
    return density === "compact" ? "h-10" : "h-14";
  };

  const getCellClassName = () => {
    return density === "compact" ? "py-1.5 px-3" : "py-3 px-4";
  };

  return {
    visibleColumns,
    setVisibleColumns,
    density,
    setDensity,
    isColumnVisible,
    getRowClassName,
    getCellClassName,
  };
};
