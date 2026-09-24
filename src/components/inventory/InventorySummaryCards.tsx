import { useMemo, useEffect, useState, useRef } from "react";
import { Package, AlertTriangle, Clock, PackageX, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { CacheInventoryItem } from "@/hooks/use-cache-inventory";

type SummaryFilter = "all" | "low_stock" | "expiring_soon" | "out_of_stock" | "containers";

interface SummaryCard {
  key: SummaryFilter;
  label: string;
  icon: typeof Package;
  value: number;
  tint: string;
  activeTint: string;
  iconColor: string;
  valueColor: string;
}

interface InventorySummaryCardsProps {
  items: CacheInventoryItem[];
  activeFilter: SummaryFilter | null;
  onFilterChange: (filter: SummaryFilter | null) => void;
}

export type { SummaryFilter };

const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const from = ref.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const duration = 600;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        ref.current = to;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value]);

  return <>{display.toLocaleString()}</>;
};

export const InventorySummaryCards = ({
  items,
  activeFilter,
  onFilterChange,
}: InventorySummaryCardsProps) => {
  const stats = useMemo(() => {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let totalAssets = 0;
    let lowStock = 0;
    let expiringSoon = 0;
    let outOfStock = 0;
    let containers = 0;

    items.forEach((item) => {
      totalAssets++;

      if (item.asset_type === "container") {
        containers++;
        return;
      }

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
        if (expDate <= soon && expDate >= now) {
          expiringSoon++;
        }
      }
    });

    return { totalAssets, lowStock, expiringSoon, outOfStock, containers };
  }, [items]);

  const cards: SummaryCard[] = [
    {
      key: "all",
      label: "Total Assets",
      icon: Package,
      value: stats.totalAssets,
      tint: "bg-primary/[0.04]",
      activeTint: "ring-2 ring-primary bg-primary/10",
      iconColor: "text-primary bg-primary/10",
      valueColor: "text-foreground",
    },
    {
      key: "low_stock",
      label: "Low Stock",
      icon: AlertTriangle,
      value: stats.lowStock,
      tint: "bg-warning/[0.06]",
      activeTint: "ring-2 ring-warning bg-warning/10",
      iconColor: "text-warning bg-warning/10",
      valueColor: "text-warning",
    },
    {
      key: "expiring_soon",
      label: "Expiring Soon",
      icon: Clock,
      value: stats.expiringSoon,
      tint: "bg-warning/[0.06]",
      activeTint: "ring-2 ring-warning bg-warning/10",
      iconColor: "text-warning bg-warning/10",
      valueColor: "text-warning",
    },
    {
      key: "out_of_stock",
      label: "Out of Stock",
      icon: PackageX,
      value: stats.outOfStock,
      tint: "bg-destructive/[0.05]",
      activeTint: "ring-2 ring-destructive bg-destructive/10",
      iconColor: "text-destructive bg-destructive/10",
      valueColor: "text-destructive",
    },
    {
      key: "containers",
      label: "Containers",
      icon: Box,
      value: stats.containers,
      tint: "bg-primary/[0.04]",
      activeTint: "ring-2 ring-primary bg-primary/10",
      iconColor: "text-primary bg-primary/10",
      valueColor: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.key;
        const hasValue = card.value > 0 || card.key === "all";

        return (
          <button
            key={card.key}
            onClick={() => onFilterChange(isActive ? null : card.key)}
            disabled={!hasValue && card.key !== "all"}
            className={cn(
              "relative flex flex-col items-start p-4 rounded-2xl border transition-all duration-[120ms] ease-out text-left",
              "hover:shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.12)] hover:-translate-y-0.5 active:scale-[0.98]",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0",
              isActive ? card.activeTint : cn(card.tint, "border-border/40 hover:border-border/60"),
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-9 h-9 rounded-xl mb-3",
              card.iconColor,
            )}>
              <Icon className="h-4.5 w-4.5" />
            </div>
            <span className={cn(
              "text-2xl font-bold tabular-nums leading-none",
              hasValue ? card.valueColor : "text-muted-foreground/40",
            )}>
              <AnimatedNumber value={card.value} />
            </span>
            <span className="text-xs text-muted-foreground/70 mt-1.5 font-medium">{card.label}</span>
            {isActive && (
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
};