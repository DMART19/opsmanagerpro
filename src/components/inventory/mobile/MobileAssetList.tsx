import { useState, useCallback, useRef, useMemo, useEffect, useLayoutEffect } from "react";
import { RefreshCw, Package } from "lucide-react";
import { motion } from "framer-motion";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { CacheInventoryItem } from "@/hooks/use-cache-inventory";
import { useInventoryGrouping, sortGroupedItems } from "@/hooks/use-inventory-grouping";
import { useBoxes } from "@/hooks/use-boxes";
import { MobileGroupedAssetCard } from "./MobileGroupedAssetCard";
import { MobileAssetSkeleton } from "./MobileAssetSkeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileAssetListProps {
  items: CacheInventoryItem[];
  loading: boolean;
  onViewItem: (item: CacheInventoryItem) => void;
  onQuickAction?: (item: CacheInventoryItem, action: "assign" | "service") => void;
  onMoveItem?: (item: CacheInventoryItem) => void;
  onDeleteItem?: (item: CacheInventoryItem) => void;
  onEditItem?: (item: CacheInventoryItem) => void;
  onAdjustQty?: (item: CacheInventoryItem) => void;
  onOpenContainer?: (containerId: string) => void;
  onRefresh: () => Promise<void>;
  hasFilters?: boolean;
  onClearFilters?: () => void;
  totalItemCount?: number;
}

export const MobileAssetList = ({
  items,
  loading,
  onViewItem,
  onQuickAction,
  onMoveItem,
  onDeleteItem,
  onEditItem,
  onAdjustQty,
  onOpenContainer,
  onRefresh,
  hasFilters = false,
  onClearFilters,
  totalItemCount = 0,
}: MobileAssetListProps) => {
  const { boxes } = useBoxes();
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const startY = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  const PULL_THRESHOLD = 80;

  // Group and sort items
  const groupedItems = useInventoryGrouping(items);
  const sortedGroups = useMemo(() => {
    return sortGroupedItems(groupedItems, "description", "asc");
  }, [groupedItems]);

  const shouldVirtualize = sortedGroups.length > 30;

  useLayoutEffect(() => {
    setScrollMargin(listRef.current?.offsetTop ?? 0);
  }, []);

  const rowVirtualizer = useWindowVirtualizer({
    count: sortedGroups.length,
    estimateSize: () => 156,
    overscan: 10,
    scrollMargin,
  });

  useEffect(() => {
    if (!shouldVirtualize) return;
    rowVirtualizer.measure();
  }, [shouldVirtualize, expandedGroups, rowVirtualizer]);

  const boxNumberById = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of boxes) m.set(b.id, b.box_number);
    return m;
  }, [boxes]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling || window.scrollY > 0) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0) {
        // Apply resistance
        const resistance = 0.4;
        setPullDistance(Math.min(diff * resistance, PULL_THRESHOLD * 1.5));
      }
    },
    [isPulling]
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }

    setIsPulling(false);
    setPullDistance(0);
  }, [pullDistance, isRefreshing, onRefresh]);

  const toggleGroupExpand = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  }, []);

  if (loading) {
    return <MobileAssetSkeleton count={8} />;
  }

  if (sortedGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Package className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {hasFilters ? "No matching assets" : "No assets yet"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mb-1">
          {hasFilters
            ? "No results in this category."
            : "Start tracking equipment, supplies, or resources by adding your first asset."}
        </p>
        {hasFilters && totalItemCount > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            <span className="font-medium text-foreground/70">{totalItemCount}</span> asset
            {totalItemCount !== 1 ? "s" : ""} available outside current filters.
          </p>
        )}
        {hasFilters && totalItemCount === 0 && <div className="mb-4" />}
        {hasFilters && onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Search All Categories
          </Button>
        )}
      </div>
    );
  }

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {/* Pull to refresh indicator */}
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden transition-all duration-200",
          pullDistance > 0 ? "opacity-100" : "opacity-0"
        )}
        style={{ height: pullDistance }}
      >
        <RefreshCw
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform",
            isRefreshing && "animate-spin",
            pullDistance >= PULL_THRESHOLD && "text-primary"
          )}
          style={{ transform: `rotate(${Math.min(pullDistance * 2, 360)}deg)` }}
        />
      </div>

      {/* Asset list */}
      <div ref={listRef} className="px-4 pb-32">
        {shouldVirtualize ? (
          <div className="relative" style={{ height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map((v) => {
              const group = sortedGroups[v.index];
              const containerName = group.primaryItem.container_id
                ? boxNumberById.get(group.primaryItem.container_id) || null
                : null;

              return (
                <div
                  key={group.groupKey}
                  data-index={v.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${v.start - scrollMargin}px)` }}
                >
                  <div className="pb-3">
                    <MobileGroupedAssetCard
                      group={group}
                      onView={onViewItem}
                      onQuickAction={onQuickAction}
                      onMove={onMoveItem}
                      onDelete={onDeleteItem}
                      onEdit={onEditItem}
                      onAdjustQty={onAdjustQty}
                      onOpenContainer={onOpenContainer}
                      containerName={containerName}
                      isExpanded={expandedGroups.has(group.groupKey)}
                      onToggleExpand={() => toggleGroupExpand(group.groupKey)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedGroups.map((group, index) => {
              const containerName = group.primaryItem.container_id
                ? boxNumberById.get(group.primaryItem.container_id) || null
                : null;

              return (
                <motion.div
                  key={group.groupKey}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: Math.min(index * 0.04, 0.4),
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  <MobileGroupedAssetCard
                    group={group}
                    onView={onViewItem}
                    onQuickAction={onQuickAction}
                    onMove={onMoveItem}
                    onDelete={onDeleteItem}
                    onEdit={onEditItem}
                    onAdjustQty={onAdjustQty}
                    onOpenContainer={onOpenContainer}
                    containerName={containerName}
                    isExpanded={expandedGroups.has(group.groupKey)}
                    onToggleExpand={() => toggleGroupExpand(group.groupKey)}
                  />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
