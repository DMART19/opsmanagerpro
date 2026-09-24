/**
 * Batch pallet packer — expands rows by quantity, then greedily fills
 * pallets one at a time using the existing autoLoadPallet engine.
 * Stacks layers within a pallet until the height cap is reached, then
 * starts the next pallet.
 */
import { autoLoadPallet, type AutoLoadItem, type AutoLoadStrategy } from "@/lib/pallet-auto-load";
import { calculateStabilityScore } from "@/lib/pallet-stability";
import type { OptimizationGoal, ParsedRow, PalletPreset, PlannedPallet } from "./types";

const STRATEGY_BY_GOAL: Record<OptimizationGoal, AutoLoadStrategy> = {
  space: "best_fit",
  weight: "balanced_weight",
  stability: "best_fit",
};

function expandRows(rows: ParsedRow[]): AutoLoadItem[] {
  const items: AutoLoadItem[] = [];
  for (const r of rows) {
    if (!r.length || !r.width || !r.height || !r.weight || !r.quantity) continue;
    for (let i = 0; i < r.quantity; i++) {
      items.push({
        id: `${r.id}-u${i}`,
        name: r.name,
        width: r.width,
        length: r.length,
        height: r.height,
        weight: r.weight,
        fragile: r.fragile,
        allowRotation: true,
        category: r.category,
        condition: "good",
        source: "item",
        sourceId: r.id,
      });
    }
  }
  return items;
}

export interface PackInput {
  rows: ParsedRow[];
  pallet: PalletPreset;
  goal: OptimizationGoal;
  /** Hard cap to prevent runaway loops */
  maxPallets?: number;
}

export interface PackOutput {
  pallets: PlannedPallet[];
  unplacedItemIds: string[];
}

export function packIntoPallets({ rows, pallet, goal, maxPallets = 100 }: PackInput): PackOutput {
  const strategy = STRATEGY_BY_GOAL[goal];
  let remaining = expandRows(rows);
  const pallets: PlannedPallet[] = [];

  while (remaining.length && pallets.length < maxPallets) {
    const placedCases = [];
    let layer = 0;
    let lastLayerHeight = 0;
    let stackedHeight = 0;
    let leftover = remaining;

    // Fill layers until no more fit or height cap reached
    while (leftover.length) {
      const res = autoLoadPallet(leftover, {
        palletWidth: pallet.width,
        palletLength: pallet.length,
        maxWeight: pallet.maxWeight,
        layer,
        strictMode: true,
        strategy,
        existingItems: placedCases,
      });
      if (!res.placed.length) break;
      placedCases.push(...res.placed);
      lastLayerHeight = Math.max(...res.placed.map((p) => p.height));
      stackedHeight += lastLayerHeight;
      leftover = res.unplaced.map((u) => ({
        id: u.item.id, name: u.item.name, width: u.item.width, length: u.item.length,
        height: u.item.height, weight: u.item.weight, fragile: u.item.fragile,
        allowRotation: u.item.allowRotation, category: u.item.category,
        condition: u.item.condition, source: u.item.source, sourceId: u.item.sourceId,
      }));
      layer++;
      if (stackedHeight + lastLayerHeight > pallet.maxHeight) break;
      // Avoid infinite loop if same set keeps failing
      if (res.placed.length === 0) break;
    }

    if (placedCases.length === 0) {
      // Nothing fit at all — bail to prevent infinite loop
      break;
    }

    const palletWeight = placedCases.reduce((s, c) => s + c.weight, 0);
    const palletCubeIn = pallet.width * pallet.length * pallet.maxHeight;
    const usedCubeIn = placedCases.reduce((s, c) => s + c.width * c.length * c.height, 0);
    const cubeUtilization = Math.round((usedCubeIn / palletCubeIn) * 1000) / 10;

    const stabilityResult = calculateStabilityScore(placedCases);
    const stability = Math.round(stabilityResult.percentage);
    const warnings: string[] = [];
    if (palletWeight > pallet.maxWeight * 0.95) warnings.push("Near weight limit");
    if (stability < 60) warnings.push("Low stability score");
    if (cubeUtilization < 40) warnings.push("Low cube utilization");

    pallets.push({
      id: crypto.randomUUID(),
      index: pallets.length + 1,
      pallet,
      placedCases,
      weight: palletWeight,
      cubeUtilization,
      stabilityScore: stability,
      warnings,
    });

    remaining = leftover;
  }

  return {
    pallets,
    unplacedItemIds: remaining.map((r) => r.id),
  };
}