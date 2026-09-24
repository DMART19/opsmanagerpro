import type { WarehouseSection } from "@/hooks/use-warehouse-sections";
import type { CacheInventoryItem } from "@/hooks/use-cache-inventory";

export interface Recommendation {
  section: WarehouseSection;
  available: number;
  score: number;
  compatibility: number;
  distance: "Short" | "Medium";
}

export interface CapacityAlert {
  level: "info" | "warn" | "danger";
  message: string;
}

/**
 * Pure recommender: picks the best section for an inventory item.
 * - 40% available fit
 * - 40% category affinity (sections with same subcategory already stored)
 * - 20% utilization balance (prefer lower-used zones)
 */
export function recommendSpace(params: {
  item: CacheInventoryItem;
  quantity: number;
  sections: WarehouseSection[];
  inventory: CacheInventoryItem[];
}): Recommendation | null {
  const { item, quantity, sections, inventory } = params;
  const need = Math.max(1, quantity);

  // Affinity map: section_code -> count of items with same subcategory
  const sameCategoryByCode = new Map<string, number>();
  if (item.subcategory) {
    for (const inv of inventory) {
      if (!inv.section) continue;
      if ((inv.subcategory || "").toLowerCase() === item.subcategory.toLowerCase()) {
        sameCategoryByCode.set(inv.section, (sameCategoryByCode.get(inv.section) || 0) + 1);
      }
    }
  }
  const maxAffinity = Math.max(1, ...Array.from(sameCategoryByCode.values()));

  const candidates = sections
    .map((s) => {
      const max = s.max_capacity || 0;
      const used = s.current_capacity || 0;
      const available = Math.max(0, max - used);
      const util = max > 0 ? used / max : 1;
      const fit = available >= need ? Math.min(1, need / Math.max(1, available)) : 0;
      const fitScore = available >= need ? 1 - Math.abs(0.5 - fit) : 0; // sweet spot
      const affinity = (sameCategoryByCode.get(s.section_code) || 0) / maxAffinity;
      const balance = 1 - util; // lower util = higher score
      const score = available >= need ? fitScore * 0.4 + affinity * 0.4 + balance * 0.2 : -1;
      return { section: s, available, score, util };
    })
    .filter((c) => c.score >= 0)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) return null;
  const best = candidates[0];
  return {
    section: best.section,
    available: best.available,
    score: best.score,
    compatibility: Math.round(Math.min(100, 60 + best.score * 40)),
    distance: best.util < 0.5 ? "Short" : "Medium",
  };
}

export function buildCapacityAlerts(params: {
  quantity: number;
  sections: WarehouseSection[];
  recommendation: Recommendation | null;
}): CapacityAlert[] {
  const { quantity, sections, recommendation } = params;
  const alerts: CapacityAlert[] = [];

  if (recommendation) {
    alerts.push({
      level: "info",
      message: `${recommendation.section.section_code} is the optimal location.`,
    });
  }

  // Sections that would exceed capacity if this item placed there
  for (const s of sections) {
    const max = s.max_capacity || 0;
    if (max === 0) continue;
    const projected = (s.current_capacity || 0) + quantity;
    if (projected > max && (s.current_capacity || 0) < max) {
      alerts.push({
        level: "danger",
        message: `${s.section_code} will exceed capacity after this placement.`,
      });
      break;
    }
  }

  // Low-util suggestion (≠ recommended)
  const low = sections
    .filter((s) => s.max_capacity > 0 && s.id !== recommendation?.section.id)
    .map((s) => ({ s, util: (s.current_capacity || 0) / s.max_capacity }))
    .filter((x) => x.util < 0.25)
    .sort((a, b) => a.util - b.util)[0];
  if (low) {
    alerts.push({
      level: "info",
      message: `${low.s.section_code} is below 25% utilization.`,
    });
  }

  return alerts.slice(0, 3);
}