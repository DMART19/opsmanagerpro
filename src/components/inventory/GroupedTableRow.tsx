import { memo } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CacheInventoryItem } from "@/hooks/use-cache-inventory";
import { GroupedInventoryItem } from "@/hooks/use-inventory-grouping";
import { InlineStatusSelect } from "./InlineStatusSelect";
import { InlineQuantityEdit } from "./InlineQuantityEdit";
import { InlineLocationEdit } from "./InlineLocationEdit";
import { RiskStatusBadge } from "./RiskStatusBadge";
import { ExpirationLabel } from "./ExpirationLabel";
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Copy, 
  MoveHorizontal, 
  Trash2,
  AlertTriangle,
  Package,
  
  UserCheck,
  Archive,
  ChevronRight,
  ChevronDown,
  Layers,
  LogOut,
  ImageOff,
  Box
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTourMode } from "@/contexts/TourModeContext";
import { format } from "date-fns";

interface GroupedTableRowProps {
  group: GroupedInventoryItem;
  isSelected: boolean;
  isHighlighted: boolean;
  expandedGroups: Set<string>;
  onToggleExpand: (groupKey: string) => void;
  onSelect: (itemId: string) => void;
  onSelectGroup: (group: GroupedInventoryItem, checked: boolean) => void;
  onView: (item: CacheInventoryItem) => void;
  onEdit: (item: CacheInventoryItem) => void;
  onDuplicate: (item: CacheInventoryItem) => void;
  onMove: (item: CacheInventoryItem) => void;
  onDelete: (item: CacheInventoryItem) => Promise<void>;
  onCheckout?: (item: CacheInventoryItem) => void;
  onRefresh?: () => void;
  showManufacturer?: boolean;
  showExpiration?: boolean;
  selectedRows: Set<string>;
  containerAncestryMap?: Map<string, string[]>;
}

// Quantity color coding respects actual item thresholds
const getQuantityStyle = (qty: number | null, criticalThreshold?: number | null, lowThreshold?: number | null) => {
  if (qty === null) return 'text-muted-foreground';
  if (qty === 0) return 'text-destructive font-semibold';
  if (criticalThreshold && criticalThreshold > 0 && qty <= criticalThreshold) return 'text-destructive font-semibold';
  if (lowThreshold && lowThreshold > 0 && qty <= lowThreshold) return 'text-amber-600 dark:text-amber-400 font-medium';
  return 'text-foreground';
};

export const GroupedTableRow = memo(({
  group,
  isSelected,
  isHighlighted,
  expandedGroups,
  onToggleExpand,
  onSelect,
  onSelectGroup,
  onView,
  onEdit,
  onDuplicate,
  onMove,
  onDelete,
  onCheckout,
  onRefresh,
  showManufacturer = false,
  showExpiration = true,
  selectedRows,
  containerAncestryMap,
}: GroupedTableRowProps) => {
  const { isTourMode } = useTourMode();
  const isExpanded = expandedGroups.has(group.groupKey);
  const isDemoCreated = isTourMode && !group.primaryItem.id.startsWith('demo_asset_');
  
  const allItemsSelected = group.items.every(item => selectedRows.has(item.id));
  const someItemsSelected = group.items.some(item => selectedRows.has(item.id)) && !allItemsSelected;

  const displayName = group.description || "Unnamed Item";
  const truncatedName = displayName.length > 50 ? displayName.substring(0, 50) + "..." : displayName;
  const hasSecondaryInfo = group.subcategory || group.section;
  const isContainer = group.primaryItem.asset_type === "container";

  const ancestry = containerAncestryMap?.get(group.primaryItem.id);
  const nestingDepth = Math.min(ancestry?.length || 0, 4);

  // Single item row
  if (group.isSingleItem) {
    const item = group.primaryItem;
    const itemIsContainer = item.asset_type === "container";

    return (
      <TableRow
        className={cn(
          "group h-[3.5rem] cursor-pointer transition-all duration-[120ms] ease-out",
          isHighlighted && "bg-primary/10 ring-1 ring-primary/20",
          selectedRows.has(item.id) && "bg-primary/5",
          !isHighlighted && !selectedRows.has(item.id) && "hover:bg-muted/40 hover:shadow-[0_1px_4px_-1px_hsl(var(--foreground)/0.06)]"
        )}
        onClick={() => onView(item)}
      >
        <TableCell className="w-12 pr-0" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedRows.has(item.id)}
            onCheckedChange={() => onSelect(item.id)}
            className="data-[state=checked]:bg-primary"
          />
        </TableCell>

        {/* Photo thumbnail */}
        <TableCell className="w-14 pr-0 py-2" onClick={(e) => e.stopPropagation()}>
          <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'flex');
                }}
              />
            ) : null}
            {itemIsContainer ? (
              <Box className={`h-4 w-4 text-primary/60 ${item.image_url ? 'hidden' : 'block'}`} />
            ) : (
              <Package className={`h-4 w-4 text-muted-foreground/40 ${item.image_url ? 'hidden' : 'block'}`} />
            )}
          </div>
        </TableCell>

        {/* Name + Category + Container (merged) */}
        <TableCell className="min-w-[280px] py-2">
          <div className="space-y-0" style={{ paddingLeft: nestingDepth > 0 ? `${nestingDepth * 14}px` : undefined }}>
            <div className="flex items-center gap-1.5 font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
              {itemIsContainer && (
                <Box className="h-3.5 w-3.5 text-primary/60 flex-shrink-0" />
              )}
              <span className="truncate">{truncatedName}</span>
              {isDemoCreated && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal opacity-70">Demo</Badge>
              )}
            </div>
            {/* Secondary line: Category • Location (editable) */}
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60 leading-tight" onClick={(e) => e.stopPropagation()}>
              {group.subcategory && (
                <span className="truncate max-w-[160px]">{group.subcategory}</span>
              )}
              {group.subcategory && (
                <span className="text-muted-foreground/30">•</span>
              )}
              <InlineLocationEdit
                itemId={item.id}
                location={item.section}
                className="text-[11px] text-muted-foreground/60"
                onUpdated={onRefresh}
              />
            </div>
          </div>
        </TableCell>

        {/* Qty */}
        <TableCell className="text-right w-20" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            <InlineQuantityEdit
              itemId={item.id}
              quantity={group.totalQuantityAvailable}
              className={getQuantityStyle(group.totalQuantityAvailable, item.critical_stock_threshold, item.low_stock_threshold)}
              onUpdated={onRefresh}
            />
            {group.totalQuantityOut > 0 && (
              <span className="text-muted-foreground/50 text-xs font-normal">
                /{group.totalQuantityAvailable + group.totalQuantityOut}
              </span>
            )}
          </div>
        </TableCell>

        {/* Status */}
        <TableCell className="w-28" onClick={(e) => e.stopPropagation()}>
          {!itemIsContainer && (
            <RiskStatusBadge
              quantity={item.quantity_available}
              lowThreshold={item.low_stock_threshold}
              criticalThreshold={item.critical_stock_threshold}
            />
          )}
        </TableCell>

        {/* Expiration */}
        {showExpiration && (
          <TableCell className="w-28">
            <ExpirationLabel dateExpire={item.date_expire} />
          </TableCell>
        )}

        {/* Actions — icon-only, hover-visible */}
        <TableCell className="w-28 pr-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onMove(item)}>
                  <MoveHorizontal className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Move</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEdit(item)}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(item)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Delete</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onView(item)} className="gap-2">
                  <Eye className="h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {onCheckout && !itemIsContainer && (item.quantity_available ?? 0) > 0 && (
                  <DropdownMenuItem onClick={() => onCheckout(item)} className="gap-2">
                    <LogOut className="h-4 w-4" />
                    Check Out
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDuplicate(item)} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  // Grouped row with expand/collapse
  return (
    <>
      <TableRow
        className={cn(
          "group h-[3.5rem] cursor-pointer transition-all duration-150",
          isHighlighted && "bg-primary/10 ring-1 ring-primary/20",
          allItemsSelected && "bg-primary/5",
          isExpanded && "bg-muted/30",
          !isHighlighted && !allItemsSelected && !isExpanded && "hover:bg-muted/50"
        )}
        onClick={() => onToggleExpand(group.groupKey)}
      >
        <TableCell className="w-12 pr-0" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={allItemsSelected}
            ref={(el) => {
              if (el && someItemsSelected) {
                (el as any).indeterminate = true;
              }
            }}
            onCheckedChange={(checked) => onSelectGroup(group, checked as boolean)}
            className="data-[state=checked]:bg-primary"
          />
        </TableCell>

        {/* Photo thumbnail */}
        <TableCell className="w-14 pr-0 py-2" onClick={(e) => e.stopPropagation()}>
          <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
            {group.primaryItem.image_url ? (
              <img
                src={group.primaryItem.image_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'flex');
                }}
              />
            ) : null}
            {isContainer ? (
              <Box className={`h-4 w-4 text-primary/60 ${group.primaryItem.image_url ? 'hidden' : 'block'}`} />
            ) : (
              <Package className={`h-4 w-4 text-muted-foreground/40 ${group.primaryItem.image_url ? 'hidden' : 'block'}`} />
            )}
          </div>
        </TableCell>

        {/* Name + secondary info (merged) */}
        <TableCell className="min-w-[280px] py-3.5">
          <div className="flex items-center gap-2" style={{ paddingLeft: nestingDepth > 0 ? `${nestingDepth * 14}px` : undefined }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 hover:bg-muted flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(group.groupKey);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                {isContainer && <Box className="h-3.5 w-3.5 text-primary/60 flex-shrink-0" />}
                <span className="font-semibold text-foreground leading-tight group-hover:text-primary transition-colors truncate">
                  {truncatedName}
                </span>
                {isDemoCreated && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal opacity-70 flex-shrink-0">Demo</Badge>
                )}
                <Badge 
                  variant="secondary" 
                  className="h-5 px-2 text-[11px] font-medium gap-1 bg-primary/8 text-primary border-0 flex-shrink-0 rounded-md"
                >
                  <Layers className="h-3 w-3" />
                  {group.itemCount} {group.itemCount === 1 ? "unit" : "units"}
                </Badge>
              </div>
              {/* Secondary: Category • Container/Location */}
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60 leading-tight">
                {group.subcategory && (
                  <span className="truncate max-w-[160px]">{group.subcategory}</span>
                )}
                {group.subcategory && (ancestry?.length || group.section) && (
                  <span className="text-muted-foreground/30">•</span>
                )}
                {ancestry && ancestry.length > 0 ? (
                  <span className="truncate max-w-[160px]">{ancestry[ancestry.length - 1]}</span>
                ) : group.section ? (
                  <span className="truncate max-w-[120px]">{group.section}</span>
                ) : null}
              </div>
            </div>
          </div>
        </TableCell>

        {/* Qty */}
        <TableCell className="text-right w-20">
          <div className="flex items-center justify-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn("text-base tabular-nums", getQuantityStyle(group.totalQuantityAvailable))}>
                  {group.totalQuantityAvailable}
                  {group.totalQuantityOut > 0 && (
                    <span className="text-muted-foreground/60 text-sm font-normal">
                      {" / "}{group.totalQuantityAvailable + group.totalQuantityOut}
                    </span>
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {group.totalQuantityOut > 0 
                  ? `${group.totalQuantityAvailable} available of ${group.totalQuantityAvailable + group.totalQuantityOut} total`
                  : `Total across ${group.itemCount} records`
                }
              </TooltipContent>
            </Tooltip>
          </div>
        </TableCell>

        {/* Status */}
        <TableCell className="w-28" onClick={(e) => e.stopPropagation()}>
          {!isContainer && (
            <RiskStatusBadge
              quantity={group.totalQuantityAvailable}
              lowThreshold={group.primaryItem?.low_stock_threshold}
              criticalThreshold={group.primaryItem?.critical_stock_threshold}
            />
          )}
        </TableCell>

        {/* Expiration */}
        {showExpiration && (
          <TableCell className="w-28">
            <ExpirationLabel dateExpire={group.earliestExpiration} />
          </TableCell>
        )}

        {/* Actions */}
        <TableCell className="w-32 pr-3" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(group.groupKey);
            }}
          >
            {isExpanded ? (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Hide
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                View Units
              </>
            )}
          </Button>
        </TableCell>
      </TableRow>

      {/* Expanded unit rows */}
      {isExpanded && group.items.map((item, index) => (
        <ExpandedItemRow
          key={item.id}
          item={item}
          unitIndex={index + 1}
          isLast={index === group.items.length - 1}
          isSelected={selectedRows.has(item.id)}
          onSelect={onSelect}
          onView={onView}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onMove={onMove}
          onDelete={onDelete}
          onCheckout={onCheckout}
          onRefresh={onRefresh}
          showExpiration={showExpiration}
          showManufacturer={showManufacturer}
        />
      ))}
    </>
  );
});

GroupedTableRow.displayName = "GroupedTableRow";

// Expanded item row component
interface ExpandedItemRowProps {
  item: CacheInventoryItem;
  isLast: boolean;
  isSelected: boolean;
  onSelect: (itemId: string) => void;
  onView: (item: CacheInventoryItem) => void;
  onEdit: (item: CacheInventoryItem) => void;
  onDuplicate: (item: CacheInventoryItem) => void;
  onMove: (item: CacheInventoryItem) => void;
  onDelete: (item: CacheInventoryItem) => Promise<void>;
  onCheckout?: (item: CacheInventoryItem) => void;
  onRefresh?: () => void;
  showExpiration: boolean;
  showManufacturer: boolean;
}

const ExpandedItemRow = memo(({
  item,
  isLast,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDuplicate,
  onMove,
  onDelete,
  onCheckout,
  onRefresh,
  showExpiration,
  showManufacturer,
  unitIndex,
}: ExpandedItemRowProps & { unitIndex: number }) => {
  const locationLabel = item.section || "No location";
  const statusLabel = item.status_item || "No status";

  return (
    <TableRow
      className={cn(
        "group cursor-pointer transition-colors duration-150",
        isSelected ? "bg-primary/5" : "bg-muted/15 hover:bg-muted/30"
      )}
      onClick={() => onView(item)}
    >
      <TableCell className="w-12 pr-0" onClick={(e) => e.stopPropagation()}>
        <div className="pl-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(item.id)}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </TableCell>

      {/* Thumbnail — smaller for sub-rows */}
      <TableCell className="w-14 pr-0 py-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="w-8 h-8 rounded overflow-hidden bg-muted flex items-center justify-center flex-shrink-0 ml-1">
          {item.image_url ? (
            <img src={item.image_url} alt="" className="w-full h-full object-cover" loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'flex');
              }}
            />
          ) : null}
          <Package className={`h-3.5 w-3.5 text-muted-foreground/30 ${item.image_url ? 'hidden' : 'block'}`} />
        </div>
      </TableCell>

      {/* Unit label + details */}
      <TableCell className="min-w-[280px] py-2.5">
        <div className="pl-8 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              Unit {unitIndex}
            </span>
            {item.serial_number && (
              <span className="text-[11px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
                SN: {item.serial_number}
              </span>
            )}
            {(item.id_cache_fema || item.id_cache_tf || item.barcode) && (
              <span className="text-[11px] text-muted-foreground/50 bg-muted/60 px-1.5 py-0.5 rounded">
                {item.id_cache_fema || item.id_cache_tf || item.barcode}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60" onClick={(e) => e.stopPropagation()}>
            <InlineLocationEdit
              itemId={item.id}
              location={item.section}
              className="text-[11px] text-muted-foreground/60"
              onUpdated={onRefresh}
            />
            <span className="text-muted-foreground/25">•</span>
            <InlineStatusSelect
              itemId={item.id}
              currentStatus={item.status_item}
              onStatusChange={onRefresh}
            />
          </div>
        </div>
      </TableCell>

      {/* Qty */}
      <TableCell className="text-right w-20" onClick={(e) => e.stopPropagation()}>
        <InlineQuantityEdit
          itemId={item.id}
          quantity={item.quantity_available ?? 0}
          className={cn("text-sm", getQuantityStyle(item.quantity_available, item.critical_stock_threshold, item.low_stock_threshold))}
          onUpdated={onRefresh}
        />
      </TableCell>

      {/* Status */}
      <TableCell className="w-28" onClick={(e) => e.stopPropagation()}>
        <RiskStatusBadge
          quantity={item.quantity_available}
          lowThreshold={item.low_stock_threshold}
          criticalThreshold={item.critical_stock_threshold}
        />
      </TableCell>

      {/* Expiration */}
      {showExpiration && (
        <TableCell className="w-28">
          <ExpirationLabel dateExpire={item.date_expire} />
        </TableCell>
      )}

      {/* Actions */}
      <TableCell className="w-28 pr-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEdit(item)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onMove(item)}>
                <MoveHorizontal className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Move</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onView(item)} className="gap-2">
                <Eye className="h-4 w-4" /> View Details
              </DropdownMenuItem>
              {onCheckout && (item.quantity_available ?? 0) > 0 && (
                <DropdownMenuItem onClick={() => onCheckout(item)} className="gap-2">
                  <LogOut className="h-4 w-4" /> Check Out
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDuplicate(item)} className="gap-2">
                <Copy className="h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(item)} className="gap-2 text-destructive">
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
});

ExpandedItemRow.displayName = "ExpandedItemRow";
