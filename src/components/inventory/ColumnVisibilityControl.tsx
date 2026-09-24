import { useState } from "react";
import { Settings2, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export interface ColumnConfig {
  id: string;
  label: string;
  defaultVisible: boolean;
  priority: "high" | "medium" | "low";
}

interface ColumnVisibilityControlProps {
  columns: ColumnConfig[];
  visibleColumns: Set<string>;
  onColumnToggle: (columnId: string) => void;
  onShowAll: () => void;
  onShowDefaults: () => void;
}

export const ColumnVisibilityControl = ({
  columns,
  visibleColumns,
  onColumnToggle,
  onShowAll,
  onShowDefaults,
}: ColumnVisibilityControlProps) => {
  const hiddenCount = columns.length - visibleColumns.size;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Columns
          {hiddenCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {hiddenCount} hidden
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Show/Hide Columns</span>
          <span className="text-xs text-muted-foreground font-normal">
            {visibleColumns.size}/{columns.length}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Quick actions */}
        <div className="flex gap-1 p-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onShowAll}
            className="flex-1 h-7 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Show All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onShowDefaults}
            className="flex-1 h-7 text-xs"
          >
            <EyeOff className="h-3 w-3 mr-1" />
            Defaults
          </Button>
        </div>
        <DropdownMenuSeparator />

        {/* High priority columns */}
        <DropdownMenuLabel className="text-xs text-muted-foreground py-1">
          Essential
        </DropdownMenuLabel>
        {columns
          .filter((col) => col.priority === "high")
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={visibleColumns.has(column.id)}
              onCheckedChange={() => onColumnToggle(column.id)}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          ))}

        <DropdownMenuSeparator />

        {/* Medium priority columns */}
        <DropdownMenuLabel className="text-xs text-muted-foreground py-1">
          Standard
        </DropdownMenuLabel>
        {columns
          .filter((col) => col.priority === "medium")
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={visibleColumns.has(column.id)}
              onCheckedChange={() => onColumnToggle(column.id)}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          ))}

        <DropdownMenuSeparator />

        {/* Low priority columns */}
        <DropdownMenuLabel className="text-xs text-muted-foreground py-1">
          Additional
        </DropdownMenuLabel>
        {columns
          .filter((col) => col.priority === "low")
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={visibleColumns.has(column.id)}
              onCheckedChange={() => onColumnToggle(column.id)}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
