import { memo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssetThumbnail } from "@/components/ui/asset-thumbnail";
import { useTourMode } from "@/contexts/TourModeContext";
import {
  ChevronRight,
  ChevronDown,
  Package,
  AlertTriangle,
  Calendar,
  Layers,
  Pencil,
  Trash2,
  Hash,
  Box,
} from "lucide-react";
import { CacheInventoryItem } from "@/hooks/use-cache-inventory";
import { GroupedInventoryItem } from "@/hooks/use-inventory-grouping";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SwipeActionRow, SwipeAction } from "./SwipeActionRow";

interface MobileGroupedAssetCardProps {
  group: GroupedInventoryItem;
  onView: (item: CacheInventoryItem) => void;
  onQuickAction?: (item: CacheInventoryItem, action: "assign" | "service") => void;
  onMove?: (item: CacheInventoryItem) => void;
  onDelete?: (item: CacheInventoryItem) => void;
  onEdit?: (item: CacheInventoryItem) => void;
  onAdjustQty?: (item: CacheInventoryItem) => void;
  onOpenContainer?: (containerId: string) => void;
  containerName?: string | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const getQuantityStyle = (
  qty: number | null,
  critThr?: number | null,
  lowThr?: number | null
) => {
  if (qty === null) return { text: "text-muted-foreground", bg: "" };
  if (qty === 0) return { text: "text-destructive font-bold", bg: "bg-destructive/8" };
  if (critThr && critThr > 0 && qty <= critThr)
    return { text: "text-destructive font-bold", bg: "bg-destructive/8" };
  if (lowThr && lowThr > 0 && qty <= lowThr)
    return { text: "text-warning font-semibold", bg: "bg-warning/8" };
  return { text: "text-foreground font-semibold", bg: "" };
};

const getStatusBadge = (
  qty: number | null,
  critThr?: number | null,
  lowThr?: number | null
) => {
  if (qty === null) return null;
  if (qty === 0)
    return {
      label: "Out of Stock",
      className: "text-destructive bg-destructive/8 border-destructive/15",
    };
  if (critThr && critThr > 0 && qty <= critThr)
    return {
      label: "Critical",
      className: "text-destructive bg-destructive/8 border-destructive/15",
    };
  if (lowThr && lowThr > 0 && qty <= lowThr)
    return {
      label: "Low Stock",
      className: "text-warning bg-warning/8 border-warning/15",
    };
  return { label: "Available", className: "text-success bg-success/8 border-success/15" };
};

// ── Helpers to build swipe actions ──
function buildRightActions(
  item: CacheInventoryItem,
  onEdit?: (item: CacheInventoryItem) => void,
  onMove?: (item: CacheInventoryItem) => void,
  onDelete?: (item: CacheInventoryItem) => void
): SwipeAction[] {
  const actions: SwipeAction[] = [];
  if (onEdit)
    actions.push({
      key: "edit",
      icon: <Pencil className="h-4 w-4" />,
      label: "Edit",
      bgClass: "bg-primary",
      textClass: "text-primary-foreground",
      onAction: () => onEdit(item),
    });
  if (onMove)
    actions.push({
      key: "move",
      icon: <Box className="h-4 w-4" />,
      label: item.container_id ? "Move" : "Assign",
      bgClass: "bg-accent",
      textClass: "text-accent-foreground",
      onAction: () => onMove(item),
    });
  if (onDelete)
    actions.push({
      key: "delete",
      icon: <Trash2 className="h-4 w-4" />,
      label: "Delete",
      bgClass: "bg-destructive",
      textClass: "text-destructive-foreground",
      onAction: () => onDelete(item),
    });
  return actions;
}

function buildLeftActions(
  item: CacheInventoryItem,
  onQuickAction?: (item: CacheInventoryItem, action: "assign" | "service") => void,
  onAdjustQty?: (item: CacheInventoryItem) => void
): SwipeAction[] {
  const actions: SwipeAction[] = [];
  if (onQuickAction)
    actions.push({
      key: "assign",
      icon: <Box className="h-4 w-4" />,
      label: item.container_id ? "Move Ctr" : "Assign Ctr",
      bgClass: "bg-success",
      textClass: "text-white",
      onAction: () => onQuickAction(item, "assign"),
    });
  if (onAdjustQty)
    actions.push({
      key: "qty",
      icon: <Hash className="h-4 w-4" />,
      label: "Qty",
      bgClass: "bg-warning",
      textClass: "text-white",
      onAction: () => onAdjustQty(item),
    });
  return actions;
}

export const MobileGroupedAssetCard = memo(({
  group,
  onView,
  onQuickAction,
  onMove,
  onDelete,
  onEdit,
  onAdjustQty,
  onOpenContainer,
  containerName,
  isExpanded,
  onToggleExpand,
}: MobileGroupedAssetCardProps) => {
  const { isTourMode } = useTourMode();
  const isDemoCreated = isTourMode && !group.primaryItem.id.startsWith("demo_asset_");

  const critThr = group.primaryItem?.critical_stock_threshold ?? 0;
  const lowThr = group.primaryItem?.low_stock_threshold ?? 0;
  const qty = group.totalQuantityAvailable ?? 0;
  const qtyStyle = getQuantityStyle(qty, critThr, lowThr);
  const status = getStatusBadge(qty, critThr, lowThr);
  const isContainer = group.primaryItem.asset_type === "container";

  const isOutOfStock = qty === 0;
  const isLowStock =
    !isOutOfStock &&
    ((critThr > 0 && qty <= critThr) || (lowThr > 0 && qty <= lowThr));

  const getExpirationInfo = () => {
    if (!group.earliestExpiration) return null;
    const expDate = new Date(group.earliestExpiration);
    const today = new Date();
    const daysUntil = Math.floor(
      (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil < 0) return { label: "Expired", className: "text-destructive" };
    if (daysUntil < 30) return { label: `${daysUntil}d left`, className: "text-warning" };
    return null;
  };

  const expInfo = getExpirationInfo();
  const displayName = group.description || "Unnamed Asset";
  const item = group.primaryItem;

  const rightActions = buildRightActions(item, onEdit, onMove, onDelete);
  const leftActions = buildLeftActions(item, onQuickAction, onAdjustQty);

  // ── Single item card ──
  if (group.isSingleItem) {
    return (
      <SwipeActionRow
        leftActions={leftActions}
        rightActions={rightActions}
        onTap={() => onView(item)}
      >
        <Card
          className={cn(
            "p-4 shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04)] active:scale-[0.985] transition-all duration-200 rounded-2xl",
            isOutOfStock || isLowStock ? "border-warning/40" : "border-border/40"
          )}
        >
          {/* Row 1: Image + Name + Qty */}
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <AssetThumbnail
                src={item.image_url}
                alt={displayName}
                size={44}
                rounded="xl"
                className="shadow-sm"
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
              {(isLowStock || isOutOfStock) && (
                <div
                  className={cn(
                    "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
                    isOutOfStock ? "bg-destructive" : "bg-warning"
                  )}
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-snug truncate">
                {displayName}
                {isDemoCreated && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 text-[10px] px-1 py-0 h-3.5 font-normal opacity-60 align-middle"
                  >
                    Demo
                  </Badge>
                )}
              </h3>
            </div>

            <div
              className={cn(
                "px-2.5 py-1 rounded-lg flex-shrink-0 flex items-center gap-1.5",
                qtyStyle.bg
              )}
            >
              <span
                className={cn(
                  "text-base font-bold tabular-nums leading-none",
                  qtyStyle.text
                )}
              >
                {qty}
                {group.totalQuantityOut > 0 && (
                  <span className="text-muted-foreground/50 text-xs font-normal">
                    /{qty + group.totalQuantityOut}
                  </span>
                )}
              </span>
              {(isOutOfStock || isLowStock) && (
                <AlertTriangle className="h-3.5 w-3.5 text-current" />
              )}
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
          </div>

          {/* Row 2: Category • Location */}
          {(group.subcategory || group.section || containerName) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-1.5 ml-[56px]">
              {group.subcategory && (
                <span className="truncate max-w-[130px]">{group.subcategory}</span>
              )}
              {group.subcategory && (group.section || containerName) && (
                <span className="text-muted-foreground/30">•</span>
              )}
              {containerName ? (
                <span
                  className="truncate max-w-[130px] text-primary/70 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    item.container_id && onOpenContainer?.(item.container_id);
                  }}
                >
                  {containerName}
                </span>
              ) : group.section ? (
                <span className="truncate max-w-[130px]">{group.section}</span>
              ) : null}
            </div>
          )}

          {/* Row 3: Status + Expiration */}
          <div className="flex items-center gap-2 mt-2 ml-[56px]">
            {status && !isContainer && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[11px] font-medium px-2 py-0.5 rounded-md",
                  status.className
                )}
              >
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
  }

  // ── Grouped card with expand/collapse ──
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <Card
        className={cn(
          "bg-card overflow-hidden transition-all duration-200 shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04)] rounded-2xl",
          isOutOfStock || isLowStock ? "border-warning/40" : "border-border/40",
          isExpanded &&
            "ring-1 ring-primary/10 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.06)]"
        )}
      >
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer active:bg-muted/20 transition-colors duration-150">
            {/* Row 1: Image + Name + Count badge + Qty */}
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <AssetThumbnail
                  src={group.primaryItem.image_url}
                  alt={displayName}
                  size={44}
                  rounded="xl"
                  className="shadow-sm"
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
                {(isLowStock || isOutOfStock) && (
                  <div
                    className={cn(
                      "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
                      isOutOfStock ? "bg-destructive" : "bg-warning"
                    )}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm leading-snug truncate">{displayName}</h3>
                  <Badge
                    variant="secondary"
                    className="h-4.5 px-1.5 text-[10px] font-medium gap-0.5 bg-primary/8 text-primary border-0 flex-shrink-0 rounded-md"
                  >
                    <Layers className="h-2.5 w-2.5" />
                    {group.itemCount} {group.itemCount === 1 ? "unit" : "units"}
                  </Badge>
                </div>
              </div>

              <div
                className={cn(
                  "px-2.5 py-1 rounded-lg flex-shrink-0 flex items-center gap-1.5",
                  qtyStyle.bg
                )}
              >
                <span
                  className={cn(
                    "text-base font-bold tabular-nums leading-none",
                    qtyStyle.text
                  )}
                >
                  {qty}
                  {group.totalQuantityOut > 0 && (
                    <span className="text-muted-foreground/50 text-xs font-normal">
                      /{qty + group.totalQuantityOut}
                    </span>
                  )}
                </span>
                {(isOutOfStock || isLowStock) && (
                  <AlertTriangle className="h-3.5 w-3.5 text-current" />
                )}
              </div>

              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-primary flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
              )}
            </div>

            {/* Row 2: Category • Location */}
            {(group.subcategory || group.section) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-1.5 ml-[56px]">
                {group.subcategory && (
                  <span className="truncate max-w-[130px]">{group.subcategory}</span>
                )}
                {group.subcategory && group.section && (
                  <span className="text-muted-foreground/30">•</span>
                )}
                {group.section && (
                  <span className="truncate max-w-[130px]">{group.section}</span>
                )}
              </div>
            )}

            {/* Row 3: Status + Expiration */}
            <div className="flex items-center gap-2 mt-2 ml-[56px]">
              {status && !isContainer && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[11px] font-medium px-2 py-0.5 rounded-md",
                    status.className
                  )}
                >
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
          </div>
        </CollapsibleTrigger>

        {/* Expanded child rows — each child gets its own swipe actions */}
        <CollapsibleContent>
          <div className="border-t border-border/30 bg-muted/10 p-3 space-y-2">
            {group.items.map((childItem, idx) => {
              const childQty = childItem.quantity_available ?? 0;
              const childQtyStyle = getQuantityStyle(
                childQty,
                childItem.critical_stock_threshold,
                childItem.low_stock_threshold
              );
              const childRight = buildRightActions(childItem, onEdit, onMove, onDelete);
              const childLeft = buildLeftActions(childItem, onQuickAction, onAdjustQty);
              const childStatus = getStatusBadge(
                childQty,
                childItem.critical_stock_threshold,
                childItem.low_stock_threshold
              );

              return (
                <SwipeActionRow
                  key={childItem.id}
                  leftActions={childLeft}
                  rightActions={childRight}
                  onTap={() => onView(childItem)}
                  className="rounded-xl"
                >
                  <div className="px-3.5 py-3 bg-card rounded-xl border border-border/30 cursor-pointer active:bg-muted/20 transition-colors duration-150">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground">
                        Unit {idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-bold tabular-nums", childQtyStyle.text)}>
                          Qty: {childQty}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground/70">
                      {childItem.section && (
                        <span>{childItem.section}</span>
                      )}
                      {childStatus && (
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 rounded", childStatus.className)}>
                          {childStatus.label}
                        </Badge>
                      )}
                      {childItem.serial_number && (
                        <span>SN: {childItem.serial_number}</span>
                      )}
                      {childItem.date_expire && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(childItem.date_expire), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                </SwipeActionRow>
              );
            })}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
});

MobileGroupedAssetCard.displayName = "MobileGroupedAssetCard";
