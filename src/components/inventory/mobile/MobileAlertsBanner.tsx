import { AlertTriangle, ChevronRight } from "lucide-react";
import { CacheInventoryItem } from "@/hooks/use-cache-inventory";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface MobileAlertsBannerProps {
  items: CacheInventoryItem[];
  isFilteringAlerts: boolean;
  onToggleAlertFilter: () => void;
}

function countAlertItems(items: CacheInventoryItem[]) {
  let critical = 0;
  let low = 0;
  let expired = 0;

  const today = new Date();
  for (const item of items) {
    if (item.asset_type === "container") continue;
    const qty = item.quantity_available ?? 0;
    const critThr = item.critical_stock_threshold;
    const lowThr = item.low_stock_threshold;

    if (qty === 0) {
      critical++;
    } else if (critThr && critThr > 0 && qty <= critThr) {
      critical++;
    } else if (lowThr && lowThr > 0 && qty <= lowThr) {
      low++;
    }

    if (item.date_expire) {
      const exp = new Date(item.date_expire);
      if (exp < today) expired++;
    }
  }

  return { critical, low, expired, total: critical + low + expired };
}

export const MobileAlertsBanner = ({
  items,
  isFilteringAlerts,
  onToggleAlertFilter,
}: MobileAlertsBannerProps) => {
  const counts = useMemo(() => countAlertItems(items), [items]);

  if (counts.total === 0) return null;

  return (
    <button
      type="button"
      onClick={onToggleAlertFilter}
      className={cn(
        "w-full mx-4 mb-3 flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 active:scale-[0.985] text-left",
        "max-w-[calc(100%-2rem)]",
        isFilteringAlerts
          ? "bg-warning/15 border border-warning/30"
          : "bg-warning/8 border border-warning/20"
      )}
    >
      <div className={cn(
        "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center",
        isFilteringAlerts ? "bg-warning/20" : "bg-warning/12"
      )}>
        <AlertTriangle className="h-4.5 w-4.5 text-warning" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-foreground">
            {counts.total} Alert{counts.total !== 1 ? "s" : ""}
          </span>
          {isFilteringAlerts && (
            <span className="text-[11px] font-medium text-warning">Filtered</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
          {isFilteringAlerts
            ? "Showing only affected items"
            : "Tap to view affected items"
          }
        </p>
      </div>

      {/* Breakdown pills */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {counts.critical > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-destructive/10 text-destructive">
            {counts.critical}
          </span>
        )}
        {counts.low > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-warning/12 text-warning">
            {counts.low}
          </span>
        )}
        {counts.expired > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-destructive/10 text-destructive">
            {counts.expired}
          </span>
        )}
      </div>

      <ChevronRight className={cn(
        "h-4 w-4 flex-shrink-0 transition-transform duration-200",
        isFilteringAlerts ? "text-warning rotate-90" : "text-muted-foreground/40"
      )} />
    </button>
  );
};

/** Utility: filter items to only those with alerts */
export function filterAlertItems(items: CacheInventoryItem[]): CacheInventoryItem[] {
  const today = new Date();
  return items.filter((item) => {
    if (item.asset_type === "container") return false;
    const qty = item.quantity_available ?? 0;
    const critThr = item.critical_stock_threshold;
    const lowThr = item.low_stock_threshold;

    if (qty === 0) return true;
    if (critThr && critThr > 0 && qty <= critThr) return true;
    if (lowThr && lowThr > 0 && qty <= lowThr) return true;
    if (item.date_expire && new Date(item.date_expire) < today) return true;
    return false;
  });
}
