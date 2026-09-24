/**
 * Section to display expiring items on calendar day views
 * Read-only informational items with dismiss capability
 */

import { AlertTriangle, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpiringCalendarItem } from "@/hooks/use-expiring-items";

interface ExpiringItemsSectionProps {
  items: ExpiringCalendarItem[];
  onItemClick: (item: ExpiringCalendarItem) => void;
  onDismiss?: (itemId: string) => void;
  compact?: boolean;
}

export const ExpiringItemsSection = ({
  items,
  onItemClick,
  onDismiss,
  compact = false,
}: ExpiringItemsSectionProps) => {
  if (items.length === 0) return null;

  const expiredItems = items.filter(item => item.type === "expired");
  const expiringItems = items.filter(item => item.type !== "expired");

  return (
    <div className={cn("space-y-2", compact ? "text-xs" : "")}>
      {/* Expired Items */}
      {expiredItems.length > 0 && (
        <div className="space-y-1">
          {expiredItems.map(item => (
            <div
              key={item.id}
              className={cn(
                "group/expiring relative w-full text-left rounded-md transition-colors",
                "bg-destructive/8 hover:bg-destructive/15 border border-destructive/20",
                compact ? "px-2 py-1" : "px-3 py-2"
              )}
            >
              <button
                onClick={() => onItemClick(item)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className={cn("text-destructive shrink-0", compact ? "h-3 w-3" : "h-4 w-4")} />
                  <span className={cn(
                    "truncate font-medium text-destructive",
                    compact ? "text-xs" : "text-sm"
                  )}>
                    {item.item.description || item.item.subcategory || "Item"} 
                    <span className="font-normal opacity-80"> • Expired</span>
                  </span>
                </div>
              </button>
              {onDismiss && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDismiss(item.id); }}
                  className="absolute top-1/2 -translate-y-1/2 right-2 h-5 w-5 flex items-center justify-center rounded bg-background/80 border border-border/50 text-muted-foreground hover:text-destructive opacity-0 group-hover/expiring:opacity-100 transition-opacity"
                  aria-label="Dismiss"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Expiring Soon Items */}
      {expiringItems.length > 0 && (
        <div className="space-y-1">
          {expiringItems.map(item => (
            <div
              key={item.id}
              className={cn(
                "group/expiring relative w-full text-left rounded-md transition-colors",
                item.type === "expiring-critical" 
                  ? "bg-amber-500/8 hover:bg-amber-500/15 border border-amber-500/20"
                  : "bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15",
                compact ? "px-2 py-1" : "px-3 py-2"
              )}
            >
              <button
                onClick={() => onItemClick(item)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Clock className={cn(
                    "shrink-0",
                    item.type === "expiring-critical" ? "text-amber-600" : "text-amber-500",
                    compact ? "h-3 w-3" : "h-4 w-4"
                  )} />
                  <span className={cn(
                    "truncate",
                    item.type === "expiring-critical" ? "text-amber-700 dark:text-amber-500" : "text-amber-600 dark:text-amber-400",
                    compact ? "text-xs" : "text-sm"
                  )}>
                    {item.item.description || item.item.subcategory || "Item"}
                    <span className="font-normal opacity-80"> • {item.daysUntil}d</span>
                  </span>
                </div>
              </button>
              {onDismiss && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDismiss(item.id); }}
                  className="absolute top-1/2 -translate-y-1/2 right-2 h-5 w-5 flex items-center justify-center rounded bg-background/80 border border-border/50 text-muted-foreground hover:text-foreground opacity-0 group-hover/expiring:opacity-100 transition-opacity"
                  aria-label="Dismiss"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Simple dot indicator for month view cells
 */
export const ExpiringItemsDot = ({ items }: { items: ExpiringCalendarItem[] }) => {
  if (items.length === 0) return null;

  const hasExpired = items.some(item => item.type === "expired");
  const hasCritical = items.some(item => item.type === "expiring-critical");

  return (
    <div className="flex gap-0.5 justify-center mt-0.5">
      {hasExpired ? (
        <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
      ) : hasCritical ? (
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      ) : (
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
      )}
    </div>
  );
};
