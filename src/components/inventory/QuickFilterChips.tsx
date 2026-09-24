import { useMemo } from "react";
import { AlertTriangle, Clock, PackageX, Layers } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CacheInventoryItem } from "@/hooks/use-cache-inventory";

export type QuickFilterType = "all" | "low_stock" | "expiring_soon" | "out_of_stock";

interface QuickFilterChipsProps {
  items: CacheInventoryItem[];
  activeFilter: QuickFilterType;
  onFilterChange: (filter: QuickFilterType) => void;
  /** Category chips */
  categories: { id: string; name: string }[];
  activeCategory: string | null;
  onCategoryChange: (id: string | null) => void;
  /** Location chips */
  locations: string[];
  activeLocation: string | null;
  onLocationChange: (loc: string | null) => void;
}

export const QuickFilterChips = ({
  items,
  activeFilter,
  onFilterChange,
  categories,
  activeCategory,
  onCategoryChange,
  locations,
  activeLocation,
  onLocationChange,
}: QuickFilterChipsProps) => {
  const stats = useMemo(() => {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let lowStock = 0;
    let expiringSoon = 0;
    let outOfStock = 0;

    items.forEach((item) => {
      if (item.asset_type === "container") return;
      const qty = item.quantity_available ?? 0;
      if (qty === 0) {
        outOfStock++;
      } else if (
        (item.low_stock_threshold && item.low_stock_threshold > 0 && qty <= item.low_stock_threshold) ||
        (item.critical_stock_threshold && item.critical_stock_threshold > 0 && qty <= item.critical_stock_threshold)
      ) {
        lowStock++;
      }
      if (item.date_expire) {
        const expDate = new Date(item.date_expire);
        if (expDate <= soon && expDate >= now) expiringSoon++;
      }
    });

    return { lowStock, expiringSoon, outOfStock };
  }, [items]);

  const stateFilters: {
    key: QuickFilterType;
    label: string;
    count?: number;
    icon?: typeof AlertTriangle;
    tintClass: string;
    activeTintClass: string;
  }[] = [
    { key: "all", label: "All", tintClass: "bg-muted/50", activeTintClass: "bg-primary text-primary-foreground" },
    {
      key: "low_stock", label: "Low Stock", count: stats.lowStock,
      icon: AlertTriangle, tintClass: "bg-warning/10 text-warning", activeTintClass: "bg-warning text-warning-foreground",
    },
    {
      key: "expiring_soon", label: "Expiring", count: stats.expiringSoon,
      icon: Clock, tintClass: "bg-warning/10 text-warning", activeTintClass: "bg-warning text-warning-foreground",
    },
    {
      key: "out_of_stock", label: "Out of Stock", count: stats.outOfStock,
      icon: PackageX, tintClass: "bg-destructive/10 text-destructive", activeTintClass: "bg-destructive text-destructive-foreground",
    },
  ];

  // Sort categories by usage count, limit visible
  const sortedCategories = useMemo(() => {
    const countMap = new Map<string, number>();
    items.forEach(i => {
      if (i.category_id) countMap.set(i.category_id, (countMap.get(i.category_id) || 0) + 1);
    });
    return [...categories]
      .sort((a, b) => (countMap.get(b.id) || 0) - (countMap.get(a.id) || 0))
      .slice(0, 10);
  }, [categories, items]);

  const sortedLocations = useMemo(() => {
    const countMap = new Map<string, number>();
    items.forEach(i => {
      if (i.section) countMap.set(i.section, (countMap.get(i.section) || 0) + 1);
    });
    return [...locations]
      .sort((a, b) => (countMap.get(b) || 0) - (countMap.get(a) || 0))
      .slice(0, 10);
  }, [locations, items]);

  const hasCategories = sortedCategories.length > 1;
  const hasLocations = sortedLocations.length > 1;

  return (
    <div className="space-y-2">
      {/* Row 1: State-based quick filters */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-0.5">
          {stateFilters.map((f) => {
            const isActive = activeFilter === f.key;
            const show = f.key === "all" || (f.count !== undefined && f.count > 0);
            if (!show) return null;
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                onClick={() => onFilterChange(isActive && f.key !== "all" ? "all" : f.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150",
                  "min-h-[36px] active:scale-[0.96]",
                  isActive ? f.activeTintClass : cn(f.tintClass, "hover:opacity-80"),
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {f.label}
                {f.count !== undefined && (
                  <span className={cn(
                    "ml-0.5 text-[10px] font-bold tabular-nums",
                    isActive ? "opacity-80" : "opacity-70",
                  )}>
                    ({f.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-0" />
      </ScrollArea>

      {/* Row 2: Category chips */}
      {hasCategories && (
        <ScrollArea className="w-full">
          <div className="flex gap-1.5 pb-0.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider self-center mr-1 shrink-0">
              Category
            </span>
            {sortedCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(activeCategory === cat.id ? null : cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150",
                  "min-h-[32px] active:scale-[0.96]",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-foreground/80 hover:bg-muted",
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="h-0" />
        </ScrollArea>
      )}

      {/* Row 3: Location chips */}
      {hasLocations && (
        <ScrollArea className="w-full">
          <div className="flex gap-1.5 pb-0.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider self-center mr-1 shrink-0">
              Location
            </span>
            {sortedLocations.map((loc) => (
              <button
                key={loc}
                onClick={() => onLocationChange(activeLocation === loc ? null : loc)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150",
                  "min-h-[32px] active:scale-[0.96]",
                  activeLocation === loc
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-foreground/80 hover:bg-muted",
                )}
              >
                {loc}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="h-0" />
        </ScrollArea>
      )}
    </div>
  );
};
