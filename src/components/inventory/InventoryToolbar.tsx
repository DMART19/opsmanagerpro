import { Plus, Upload, FileDown, Settings2, MoreHorizontal, Printer, Package, Archive, ChevronDown } from "lucide-react";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { useIsMobile } from "@/hooks/use-mobile";
import { GuidanceTooltip } from "@/components/guidance";
import { GuidanceHighlight } from "@/components/guidance/GuidanceHighlight";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { DataFreshness } from "@/components/ui/data-freshness";

interface ColumnConfig {
  key: string;
  label: string;
}

interface InventoryToolbarProps {
  itemCount: number;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  onAddItem: () => void;
  onAddContainer?: () => void;
  onImport: () => void;
  onExport: (format: "csv" | "excel" | "pdf") => void;
  onPrint?: () => void;
  optionalColumns: ColumnConfig[];
  visibleColumns: Set<string>;
  onToggleColumn: (key: string) => void;
}

export const InventoryToolbar = ({
  itemCount,
  lastUpdated,
  isRefreshing,
  onRefresh,
  onAddItem,
  onAddContainer,
  onImport,
  onExport,
  onPrint,
  optionalColumns,
  visibleColumns,
  onToggleColumn,
}: InventoryToolbarProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-2">
      <GuidanceTooltip
        guidanceId="assets_add_hint"
        message="Items track supplies or equipment. Containers represent storage units like shelves, boxes, or bins."
        action={{ label: "+ Add Item", onClick: () => document.getElementById("add-item-button")?.click() }}
      />
    <div className="flex flex-wrap gap-3 justify-between items-center">
      {/* Left: Item count - subtle */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground tabular-nums">
          {itemCount.toLocaleString()} {itemCount === 1 ? 'asset' : 'assets'}
        </span>
        <DataFreshness 
          lastUpdated={lastUpdated} 
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      </div>
      
      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Add buttons - gated to create_assets permission */}
        <PermissionGate permission="create_assets" fallback="disabled" deniedMessage="Asset creation requires Inventory Clerk, Supervisor, or Workspace Admin.">
        {isMobile ? (
          /* Mobile: single dropdown */
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 animate-in fade-in-0 zoom-in-95 duration-150">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  requestAnimationFrame(() => onAddItem());
                }}
                className="gap-2 cursor-pointer"
              >
                <Package className="h-4 w-4" />
                Add Item
              </DropdownMenuItem>
              {onAddContainer && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    requestAnimationFrame(() => onAddContainer());
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <Archive className="h-4 w-4" />
                  Add Container
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          /* Desktop/Tablet: two separate buttons */
          <div className="flex items-center gap-2">
            <GuidanceHighlight resolveKey="add_item_button">
              <Button onClick={onAddItem} className="gap-2" id="add_item_button">
                <Package className="h-4 w-4" />
                Add Item
              </Button>
            </GuidanceHighlight>
            {onAddContainer && (
              <GuidanceHighlight resolveKey="add_container_button">
                <Button onClick={onAddContainer} variant="outline" className="gap-2" id="add_container_button">
                  <Archive className="h-4 w-4" />
                  Add Container
                </Button>
              </GuidanceHighlight>
            )}
          </div>
        )}
        </PermissionGate>
        
        {/* Column visibility - Settings icon */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10">
              <Settings2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Show Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {optionalColumns.map(col => (
              <DropdownMenuCheckboxItem
                key={col.key}
                checked={visibleColumns.has(col.key)}
                onCheckedChange={() => onToggleColumn(col.key)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Secondary Actions - Grouped */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onImport} className="gap-2">
              <Upload className="h-4 w-4" />
              Import Spreadsheet
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Export</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onExport("csv")} className="gap-2">
              <FileDown className="h-4 w-4" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("excel")} className="gap-2">
              <FileDown className="h-4 w-4" />
              Export as Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("pdf")} className="gap-2">
              <FileDown className="h-4 w-4" />
              Export as PDF
            </DropdownMenuItem>
            {onPrint && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onPrint} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Print View
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    </div>
  );
};
