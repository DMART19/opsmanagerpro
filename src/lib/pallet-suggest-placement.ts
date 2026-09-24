/**
 * Suggested Placement — scoring helper.
 *
 * For a given inventory item with known dimensions, iterates candidate (x, y, layer)
 * positions on a 2-inch grid and returns the top suggestion with reasons, a 0..100
 * confidence score, and a metric impact preview.
 *
 * Pure function — no React, no state.
 */

import { PlacedCase, PalletLibraryItem } from "@/types/pallet-builder";
import { getWeightDistribution } from "./pallet-spatial-warnings";

const GRID = 2; // inches
const MAX_LAYER = 5;

export interface SuggestedPlacement {
  x: number;
  y: number;
  z: number;
  rotation: number;
  confidence: number;
  reasons: string[];
  impact: {
    weightAfter: number;
    weightCapacity: number;
    utilizationAfter: number;
    remainingCapacity: number;
  };
}

function collides(
  x: number, y: number, w: number, l: number, z: number,
  occupied: PlacedCase[]
): boolean {
  for (const c of occupied) {
    if (c.z !== z) continue;
    const cw = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
    const cl = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
    if (!(x + w <= c.x || x >= c.x + cw || y + l <= c.y || y >= c.y + cl)) return true;
  }
  return false;
}

export interface SuggestConfig {
  palletWidth: number;
  palletLength: number;
  maxWeight: number;
  placed: PlacedCase[];
}

export function suggestPlacement(
  item: PalletLibraryItem,
  config: SuggestConfig,
): SuggestedPlacement | null {
  if (!item.width || !item.length || !item.height || item.weight == null) return null;

  const { palletWidth, palletLength, maxWeight, placed } = config;
  const currentWeight = placed.reduce((s, c) => s + c.weight, 0);
  if (currentWeight + item.weight > maxWeight) return null;

  const palletArea = palletWidth * palletLength;
  const usedArea = placed.reduce((s, c) => {
    const w = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
    const l = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
    return s + w * l;
  }, 0);

  const orientations: Array<{ w: number; l: number; rot: number }> = [
    { w: item.width, l: item.length, rot: 0 },
  ];
  if (item.allowRotation !== false) {
    orientations.push({ w: item.length, l: item.width, rot: 90 });
  }

  let best: { score: number; suggestion: SuggestedPlacement } | null = null;
  const layerSpan = Math.min(MAX_LAYER, Math.max(1, (placed.length ? Math.max(...placed.map(c => c.z)) : 1) + 1));

  for (let z = 1; z <= layerSpan; z++) {
    for (const o of orientations) {
      if (o.w > palletWidth || o.l > palletLength) continue;
      for (let y = 0; y <= palletLength - o.l; y += GRID) {
        for (let x = 0; x <= palletWidth - o.w; x += GRID) {
          if (collides(x, y, o.w, o.l, z, placed)) continue;

          // Score components (each 0..1, higher = better)
          // 1) Compactness — proximity to existing items on the same layer (or pallet center if empty)
          const layerItems = placed.filter(c => c.z === z);
          let compactness: number;
          if (layerItems.length === 0) {
            const dx = (x + o.w / 2) - palletWidth / 2;
            const dy = (y + o.l / 2) - palletLength / 2;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = Math.sqrt(palletWidth * palletWidth + palletLength * palletLength) / 2;
            compactness = 1 - Math.min(1, dist / maxDist);
          } else {
            let minGap = Infinity;
            for (const c of layerItems) {
              const cw = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
              const cl = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
              const gx = Math.max(0, Math.max(c.x - (x + o.w), x - (c.x + cw)));
              const gy = Math.max(0, Math.max(c.y - (y + o.l), y - (c.y + cl)));
              const gap = Math.sqrt(gx * gx + gy * gy);
              if (gap < minGap) minGap = gap;
            }
            compactness = 1 - Math.min(1, minGap / 24);
          }

          // 2) Balance — how the placement affects CoG distance from center
          const candidate: PlacedCase = {
            id: "candidate", caseId: item.name, caseType: item.category || "Standard",
            x, y, z, rotation: o.rot, width: item.width, length: item.length,
            height: item.height!, weight: item.weight!, condition: item.condition || "good",
          };
          const distAfter = getWeightDistribution([...placed, candidate], palletWidth, palletLength).severity;
          const balance = 1 - distAfter;

          // 3) Heavy-low — heavier items prefer lower layers
          const heaviness = Math.min(1, item.weight! / Math.max(1, maxWeight * 0.15));
          const heavyLow = 1 - ((z - 1) / MAX_LAYER) * heaviness;

          // 4) Edge avoidance — slight penalty for hugging the edge
          const edgePenalty =
            (x < 2 ? 0.1 : 0) +
            (y < 2 ? 0.1 : 0) +
            (palletWidth - (x + o.w) < 2 ? 0.1 : 0) +
            (palletLength - (y + o.l) < 2 ? 0.1 : 0);
          const edgeScore = Math.max(0, 1 - edgePenalty);

          const score = compactness * 0.4 + balance * 0.3 + heavyLow * 0.2 + edgeScore * 0.1;

          if (!best || score > best.score) {
            const newUsed = usedArea + o.w * o.l;
            const utilizationAfter = Math.min(100, Math.round((newUsed / palletArea) * 100));
            const reasons: string[] = [];
            if (compactness > 0.7) reasons.push(layerItems.length === 0 ? "Anchors near pallet centre" : "Tucks tight against existing items");
            if (balance > 0.7) reasons.push("Maintains weight balance");
            if (z === 1 && heaviness > 0.4) reasons.push("Keeps heavy items low");
            if (edgeScore > 0.85) reasons.push("Clears the pallet edge");
            if (reasons.length === 0) reasons.push("Best available position on this pallet");

            best = {
              score,
              suggestion: {
                x, y, z, rotation: o.rot,
                confidence: Math.round(score * 100),
                reasons: reasons.slice(0, 3),
                impact: {
                  weightAfter: currentWeight + item.weight!,
                  weightCapacity: maxWeight,
                  utilizationAfter,
                  remainingCapacity: Math.max(0, maxWeight - (currentWeight + item.weight!)),
                },
              },
            };
          }
        }
      }
    }
    if (best && best.score > 0.85) break; // good enough — stop searching deeper layers
  }

  return best ? best.suggestion : null;
}