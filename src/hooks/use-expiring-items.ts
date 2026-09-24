/**
 * Hook to get expiring items for calendar display
 * 
 * Shows items that are:
 * - Already expired (critical)
 * - Expiring within 30 days (warning)
 */

import { useMemo } from "react";
import { differenceInDays, isPast, parseISO } from "date-fns";
import { useCacheInventory, CacheInventoryItem } from "@/hooks/use-cache-inventory";

export interface ExpiringCalendarItem {
  id: string;
  itemId: string;
  title: string;
  date: Date;
  type: "expired" | "expiring-critical" | "expiring-warning";
  daysUntil: number;
  item: CacheInventoryItem;
}

const CRITICAL_DAYS = 7;
const WARNING_DAYS = 30;

export const useExpiringItems = () => {
  const { items, loading } = useCacheInventory();

  const expiringItems = useMemo((): ExpiringCalendarItem[] => {
    if (loading) return [];

    const now = new Date();
    const results: ExpiringCalendarItem[] = [];

    items.forEach(item => {
      if (!item.date_expire) return;

      const expiryDate = parseISO(item.date_expire);
      const daysUntil = differenceInDays(expiryDate, now);
      const itemName = item.description || item.subcategory || "Unnamed Item";

      // Expired items
      if (isPast(expiryDate)) {
        results.push({
          id: `expiry-${item.id}`,
          itemId: item.id,
          title: `⚠️ ${itemName} (Expired)`,
          date: expiryDate,
          type: "expired",
          daysUntil,
          item,
        });
      }
      // Expiring within 7 days (critical)
      else if (daysUntil <= CRITICAL_DAYS) {
        results.push({
          id: `expiry-${item.id}`,
          itemId: item.id,
          title: `${itemName} (Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''})`,
          date: expiryDate,
          type: "expiring-critical",
          daysUntil,
          item,
        });
      }
      // Expiring within 30 days (warning)
      else if (daysUntil <= WARNING_DAYS) {
        results.push({
          id: `expiry-${item.id}`,
          itemId: item.id,
          title: `${itemName} (Expires in ${daysUntil} days)`,
          date: expiryDate,
          type: "expiring-warning",
          daysUntil,
          item,
        });
      }
    });

    // Sort by expiry date (soonest first)
    return results.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [items, loading]);

  // Get items expiring on a specific date
  const getItemsForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return expiringItems.filter(item => item.date.toDateString() === dateStr);
  };

  // Get all expired items
  const expiredItems = useMemo(() => {
    return expiringItems.filter(item => item.type === "expired");
  }, [expiringItems]);

  // Get items expiring soon (not yet expired)
  const expiringSoonItems = useMemo(() => {
    return expiringItems.filter(item => item.type !== "expired");
  }, [expiringItems]);

  return {
    expiringItems,
    expiredItems,
    expiringSoonItems,
    getItemsForDate,
    loading,
  };
};
