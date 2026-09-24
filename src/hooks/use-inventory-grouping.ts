import { useMemo } from "react";
import { CacheInventoryItem } from "@/hooks/use-cache-inventory";

export interface GroupedInventoryItem {
  // Grouping key
  groupKey: string;
  
  // Display values (from the first item or aggregated)
  description: string | null;
  subcategory: string | null;
  section: string | null;
  status_item: string | null;
  manufacturer: string | null;
  
  // Aggregated values
  totalQuantityAvailable: number;
  totalQuantityOut: number;
  itemCount: number;
  
  // Original items in this group
  items: CacheInventoryItem[];
  
  // For single items, expose the original for direct access
  isSingleItem: boolean;
  primaryItem: CacheInventoryItem;
  
  // Earliest expiration across the group
  earliestExpiration: string | null;
}

/**
 * Creates a grouping key from item properties
 * Items are considered duplicates when they share:
 * - Item name (description)
 * - Category (category_id)
 * - Status (asset_status_id)
 * - Location (section)
 */
function createGroupKey(item: CacheInventoryItem): string {
  const parts = [
    (item.description || "").toLowerCase().trim(),
    item.category_id || "__none__",
    item.asset_status_id || "__none__",
    (item.section || "").toLowerCase().trim(),
  ];
  return parts.join("|||");
}

/**
 * Hook to consolidate duplicate inventory items for cleaner UI display
 * Groups items by name, category, status, and location
 * Aggregates quantities while preserving access to underlying records
 */
export function useInventoryGrouping(items: CacheInventoryItem[]): GroupedInventoryItem[] {
  return useMemo(() => {
    const groups = new Map<string, CacheInventoryItem[]>();
    
    // Group items by key
    items.forEach(item => {
      const key = createGroupKey(item);
      const existing = groups.get(key) || [];
      existing.push(item);
      groups.set(key, existing);
    });
    
    // Convert groups to GroupedInventoryItem[]
    const result: GroupedInventoryItem[] = [];
    
    groups.forEach((groupItems, groupKey) => {
      // Use the first item as the primary/display item
      const primaryItem = groupItems[0];
      
      // Aggregate quantities
      const totalQuantityAvailable = groupItems.reduce(
        (sum, item) => sum + (item.quantity_available ?? 0),
        0
      );
      const totalQuantityOut = groupItems.reduce(
        (sum, item) => sum + (item.quantity_out ?? 0),
        0
      );
      
      // Find earliest expiration
      const expirations = groupItems
        .map(item => item.date_expire)
        .filter((d): d is string => d !== null && d !== undefined)
        .sort();
      const earliestExpiration = expirations.length > 0 ? expirations[0] : null;
      
      result.push({
        groupKey,
        description: primaryItem.description,
        subcategory: primaryItem.subcategory,
        section: primaryItem.section,
        status_item: primaryItem.status_item,
        manufacturer: primaryItem.manufacturer,
        totalQuantityAvailable,
        totalQuantityOut,
        itemCount: groupItems.length,
        items: groupItems,
        isSingleItem: groupItems.length === 1,
        primaryItem,
        earliestExpiration,
      });
    });
    
    return result;
  }, [items]);
}

/**
 * Sort grouped items - maintains the same sort logic as individual items
 */
export function sortGroupedItems(
  items: GroupedInventoryItem[],
  sortBy: string | null,
  sortOrder: "asc" | "desc"
): GroupedInventoryItem[] {
  if (!sortBy) return items;
  
  return [...items].sort((a, b) => {
    let aVal: any;
    let bVal: any;
    
    switch (sortBy) {
      case "description":
        aVal = a.description?.toLowerCase() || "";
        bVal = b.description?.toLowerCase() || "";
        break;
      case "quantity_available":
        aVal = a.totalQuantityAvailable;
        bVal = b.totalQuantityAvailable;
        break;
      case "status_item":
        aVal = a.status_item?.toLowerCase() || "";
        bVal = b.status_item?.toLowerCase() || "";
        break;
      case "date_expire":
        aVal = a.earliestExpiration || "9999-12-31";
        bVal = b.earliestExpiration || "9999-12-31";
        break;
      default:
        return 0;
    }
    
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });
}
