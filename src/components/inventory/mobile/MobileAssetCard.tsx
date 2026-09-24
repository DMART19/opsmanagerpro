import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssetThumbnail } from "@/components/ui/asset-thumbnail";
import { 
  ChevronRight, 
  Package, 
  AlertTriangle,
  Calendar,
  Box,
  Pencil,
  MoveHorizontal,
  Trash2,
  PlusSquare,
  Hash
} from "lucide-react";
import { CacheInventoryItem } from "@/hooks/use-cache-inventory";
import { cn } from "@/lib/utils";
import { SwipeActionRow, SwipeAction } from "./SwipeActionRow";

interface MobileAssetCardProps {
  item: CacheInventoryItem;
  onView: (item: CacheInventoryItem) => void;
  onQuickAction?: (item: CacheInventoryItem, action: 'assign' | 'service') => void;
  onMove?: (item: CacheInventoryItem) => void;
  onDelete?: (item: CacheInventoryItem) => void;
  onEdit?: (item: CacheInventoryItem) => void;
  onAdjustQty?: (item: CacheInventoryItem) => void;
}

const getQuantityStyle = (qty: number | null, criticalThreshold?: number | null, lowThreshold?: number | null) => {
  if (qty === null) return { text: 'text-muted-foreground', bg: '' };
  if (qty === 0) return { text: 'text-destructive font-bold', bg: 'bg-destructive/8' };
  if (criticalThreshold && criticalThreshold > 0 && qty <= criticalThreshold)
    return { text: 'text-destructive font-bold', bg: 'bg-destructive/8' };
  if (lowThreshold && lowThreshold > 0 && qty <= lowThreshold)
    return { text: 'text-warning font-semibold', bg: 'bg-warning/8' };
  return { text: 'text-foreground font-semibold', bg: '' };
};

const getStatusBadge = (qty: number | null, criticalThreshold?: number | null, lowThreshold?: number | null) => {
  if (qty === null) return null;
  if (qty === 0) return { label: 'Out of Stock', className: 'text-destructive bg-destructive/8 border-destructive/15' };
  if (criticalThreshold && criticalThreshold > 0 && qty <= criticalThreshold)
    return { label: 'Critical', className: 'text-destructive bg-destructive/8 border-destructive/15' };
  if (lowThreshold && lowThreshold > 0 && qty <= lowThreshold)
    return { label: 'Low Stock', className: 'text-warning bg-warning/8 border-warning/15' };
  return { label: 'Available', className: 'text-success bg-success/8 border-success/15' };
};

export const MobileAssetCard = ({ item, onView, onQuickAction, onMove, onDelete, onEdit, onAdjustQty }: MobileAssetCardProps) => {
  const qtyStyle = getQuantityStyle(item.quantity_available, item.critical_stock_threshold, item.low_stock_threshold);
  const status = getStatusBadge(item.quantity_available, item.critical_stock_threshold, item.low_stock_threshold);

  const getExpirationInfo = () => {
    if (!item.date_expire) return null;
    const expDate = new Date(item.date_expire);
    const today = new Date();
    const daysUntil = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return { label: 'Expired', className: 'text-destructive' };
    if (daysUntil < 30) return { label: `${daysUntil}d left`, className: 'text-warning' };
    return null;
  };

  const expInfo = getExpirationInfo();
  const displayName = item.description || item.id_cache_fema || 'Unnamed Asset';
  const isContainer = item.asset_type === 'container';
  const isLow = (item.quantity_available ?? 0) === 0 ||
    (item.critical_stock_threshold && item.critical_stock_threshold > 0 && (item.quantity_available ?? 0) <= item.critical_stock_threshold) ||
    (item.low_stock_threshold && item.low_stock_threshold > 0 && (item.quantity_available ?? 0) <= item.low_stock_threshold);

  // Build swipe actions
  const rightActions: SwipeAction[] = [];
  if (onEdit) rightActions.push({
    key: 'edit', icon: <Pencil className="h-4 w-4" />, label: 'Edit',
    bgClass: 'bg-primary', textClass: 'text-primary-foreground',
    onAction: () => onEdit(item),
  });
  if (onMove) rightActions.push({
    key: 'move', icon: <Box className="h-4 w-4" />,
    label: item.container_id ? 'Move' : 'Assign',
    bgClass: 'bg-accent', textClass: 'text-accent-foreground',
    onAction: () => onMove(item),
  });
  if (onDelete) rightActions.push({
    key: 'delete', icon: <Trash2 className="h-4 w-4" />, label: 'Delete',
    bgClass: 'bg-destructive', textClass: 'text-destructive-foreground',
    onAction: () => onDelete(item),
  });

  const leftActions: SwipeAction[] = [];
  if (onQuickAction) leftActions.push({
    key: 'assign',
    icon: <Box className="h-4 w-4" />,
    label: item.container_id ? 'Move Ctr' : 'Assign Ctr',
    bgClass: 'bg-success', textClass: 'text-white',
    onAction: () => onQuickAction(item, 'assign'),
  });
  if (onAdjustQty) leftActions.push({
    key: 'qty', icon: <Hash className="h-4 w-4" />, label: 'Qty',
    bgClass: 'bg-warning', textClass: 'text-white',
    onAction: () => onAdjustQty(item),
  });

  return (
    <SwipeActionRow
      leftActions={leftActions}
      rightActions={rightActions}
      onTap={() => onView(item)}
    >
      <Card className={cn(
        "p-4 shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04)] active:scale-[0.985] transition-all duration-200 rounded-2xl",
        isLow ? "border-warning/40" : "border-border/40"
      )}>
        {/* Row 1: Image + Name + Qty */}
        <div className="flex items-center gap-3">
          <AssetThumbnail
            src={item.image_url}
            alt={displayName}
            size={44}
            rounded="xl"
            className="shadow-sm flex-shrink-0"
            fallback={
              <div className="w-full h-full rounded-xl flex items-center justify-center bg-muted">
                {isContainer ? (
                  <Box className="h-5 w-5 text-primary/50" />
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground/40" />
                )}
              </div>
            }
          />

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-snug truncate">{displayName}</h3>
          </div>

          <div className={cn("px-2.5 py-1 rounded-lg flex-shrink-0 flex items-center gap-1.5", qtyStyle.bg)}>
            <span className={cn("text-base font-bold tabular-nums leading-none", qtyStyle.text)}>
              {item.quantity_available ?? 0}
            </span>
            {isLow && <AlertTriangle className="h-3.5 w-3.5 text-current" />}
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
        </div>

        {/* Row 2: Category • Location */}
        {(item.subcategory || item.section) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-1.5 ml-[56px]">
            {item.subcategory && <span className="truncate max-w-[140px]">{item.subcategory}</span>}
            {item.subcategory && item.section && <span className="text-muted-foreground/30">•</span>}
            {item.section && <span className="truncate max-w-[140px]">{item.section}</span>}
          </div>
        )}

        {/* Row 3: Status badge + Expiration */}
        <div className="flex items-center gap-2 mt-2 ml-[56px]">
          {status && (
            <Badge variant="outline" className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md", status.className)}>
              {status.label}
            </Badge>
          )}
          {expInfo && (
            <span className={cn("text-[11px] flex items-center gap-1", expInfo.className)}>
              <Calendar className="h-3 w-3" />
              {expInfo.label}
            </span>
          )}
        </div>
      </Card>
    </SwipeActionRow>
  );
};
