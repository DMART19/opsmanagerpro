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
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Copy, 
  MoveHorizontal, 
  Trash2,
  AlertTriangle,
  Package,
  Wrench,
  UserCheck,
  Archive,
  MapPin,
  ImageOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface SmartTableRowProps {
  item: CacheInventoryItem;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: (itemId: string) => void;
  onView: (item: CacheInventoryItem) => void;
  onEdit: (item: CacheInventoryItem) => void;
  onDuplicate: (item: CacheInventoryItem) => void;
  onMove: (item: CacheInventoryItem) => void;
  onDelete: (item: CacheInventoryItem) => Promise<void>;
  showManufacturer?: boolean;
  showExpiration?: boolean;
}

// Status configuration with icons - consolidated and consistent
const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof Package }> = {
  'IN': { 
    label: 'Available', 
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800',
    icon: Package
  },
  'OUT': { 
    label: 'In Use', 
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800',
    icon: UserCheck
  },
  'MAINT': { 
    label: 'Service', 
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800',
    icon: Wrench
  },
  'RETIRED': { 
    label: 'Retired', 
    className: 'bg-muted text-muted-foreground border-muted',
    icon: Archive
  },
  'Available': { 
    label: 'Available', 
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800',
    icon: Package
  },
  'In Use': { 
    label: 'In Use', 
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800',
    icon: UserCheck
  },
  'Under Service': { 
    label: 'Service', 
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800',
    icon: Wrench
  },
};

// Quantity color coding respects actual item thresholds — NOT hardcoded numbers
const getQuantityStyle = (qty: number | null, criticalThreshold?: number | null, lowThreshold?: number | null) => {
  if (qty === null) return 'text-muted-foreground';
  if (qty === 0) return 'text-destructive font-bold';
  if (criticalThreshold && criticalThreshold > 0 && qty <= criticalThreshold) return 'text-destructive font-bold';
  if (lowThreshold && lowThreshold > 0 && qty <= lowThreshold) return 'text-amber-600 dark:text-amber-400 font-semibold';
  return 'text-foreground font-semibold';
};

// Alert indicator: only triggers when threshold is set (> 0) AND qty is at or below it
const getQuantityIndicator = (qty: number | null, criticalThreshold?: number | null, lowThreshold?: number | null) => {
  if (qty === 0) return { show: true, type: 'critical', label: 'Out of stock' };
  if (criticalThreshold && criticalThreshold > 0 && qty !== null && qty <= criticalThreshold)
    return { show: true, type: 'critical', label: 'Critical stock' };
  if (lowThreshold && lowThreshold > 0 && qty !== null && qty <= lowThreshold)
    return { show: true, type: 'low', label: 'Low stock' };
  return { show: false, type: '', label: '' };
};

export const SmartTableRow = memo(({
  item,
  isSelected,
  isHighlighted,
  onSelect,
  onView,
  onEdit,
  onDuplicate,
  onMove,
  onDelete,
  showManufacturer = false,
  showExpiration = true,
}: SmartTableRowProps) => {
  const statusConfig = STATUS_CONFIG[item.status_item || 'IN'] || STATUS_CONFIG['IN'];
  const StatusIcon = statusConfig.icon;
  const qtyIndicator = getQuantityIndicator(item.quantity_available, item.critical_stock_threshold, item.low_stock_threshold);

  // Expiration check with clear visual states
  const getExpirationStatus = () => {
    if (!item.date_expire) return null;
    const expDate = new Date(item.date_expire);
    const today = new Date();
    const daysUntil = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return { status: 'expired', label: 'Expired', className: 'text-destructive font-medium' };
    if (daysUntil <= 7) return { status: 'critical', label: `${daysUntil}d`, className: 'text-destructive font-medium' };
    if (daysUntil <= 30) return { status: 'soon', label: `${daysUntil}d`, className: 'text-amber-600 dark:text-amber-400 font-medium' };
    return { status: 'valid', label: format(expDate, "MMM d"), className: 'text-muted-foreground' };
  };
  
  const expStatus = getExpirationStatus();

  // Display name with smart truncation
  const displayName = item.description || item.id_cache_fema || "Unnamed Item";
  const truncatedName = displayName.length > 50 ? displayName.substring(0, 50) + "..." : displayName;

  // Secondary info line - category and location
  const hasSecondaryInfo = item.subcategory || item.section;

  return (
    <TableRow
      className={cn(
        "group h-[4.25rem] cursor-pointer transition-all duration-150",
        isHighlighted && "bg-primary/10 ring-1 ring-primary/20",
        isSelected && "bg-primary/5 hover:bg-primary/10",
        !isHighlighted && !isSelected && "hover:bg-muted/30 hover:shadow-[inset_0_0_0_1px_hsl(var(--border)/0.3)]"
      )}
      onClick={() => onView(item)}
    >
      {/* Checkbox - stops propagation */}
      <TableCell className="w-12 pr-0" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
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
          <ImageOff className={`h-4 w-4 text-muted-foreground/40 ${item.image_url ? 'hidden' : 'block'}`} />
        </div>
      </TableCell>

      {/* Primary Column: Two-line layout */}
      <TableCell className="min-w-[280px] py-3.5">
        <div className="space-y-0.5">
          {/* Primary: Item name */}
          <div className="font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
            {truncatedName}
          </div>
          {/* Secondary: Category + Location */}
          {hasSecondaryInfo && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {item.subcategory && (
                <span className="truncate max-w-[160px]">{item.subcategory}</span>
              )}
              {item.subcategory && item.section && (
                <span className="text-muted-foreground/40">•</span>
              )}
              {item.section && (
                <span className="flex items-center gap-1 truncate max-w-[120px]">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {item.section}
                </span>
              )}
            </div>
          )}
        </div>
      </TableCell>

      {/* Quantity - Bold and color-coded */}
      <TableCell className="text-right w-28">
        <div className="flex items-center justify-end gap-2">
          <span className={cn("text-base tabular-nums", getQuantityStyle(item.quantity_available))}>
            {item.quantity_available ?? 0}
          </span>
          {qtyIndicator.show && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className={cn(
                  "h-4 w-4 flex-shrink-0",
                  qtyIndicator.type === 'critical' ? "text-destructive" : "text-amber-500"
                )} />
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">{qtyIndicator.label}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>

      {/* Status - Compact badge with icon */}
      <TableCell className="w-32">
        <Badge 
          variant="outline" 
          className={cn("text-xs font-semibold gap-1.5 px-2.5 py-1", statusConfig.className)}
        >
          <StatusIcon className="h-3 w-3" />
          {statusConfig.label}
        </Badge>
      </TableCell>

      {/* Expiration - Contextual display */}
      {showExpiration && (
        <TableCell className="w-28">
          {expStatus ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn("text-sm cursor-help", expStatus.className)}>
                  {expStatus.label}
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {expStatus.status === 'expired' 
                  ? 'This item has expired'
                  : `Expires ${format(new Date(item.date_expire!), "MMM d, yyyy")}`
                }
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-muted-foreground/40 text-sm">—</span>
          )}
        </TableCell>
      )}

      {/* Manufacturer (optional) */}
      {showManufacturer && (
        <TableCell className="hidden xl:table-cell w-36">
          <span className="text-sm text-muted-foreground truncate block max-w-[140px]">
            {item.manufacturer || <span className="text-muted-foreground/40">—</span>}
          </span>
        </TableCell>
      )}

      {/* Row Actions - Visible on hover */}
      <TableCell className="w-12 pr-4" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onView(item)} className="gap-2">
              <Eye className="h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(item)} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(item)} className="gap-2">
              <Copy className="h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(item)} className="gap-2">
              <MoveHorizontal className="h-4 w-4" />
              Move to Location
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(item)}
              className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

SmartTableRow.displayName = "SmartTableRow";
