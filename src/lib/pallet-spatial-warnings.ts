/**
 * Pallet Spatial Warnings
 * 
 * Computes soft visual warnings for placed items:
 * - Near overhang (within threshold of pallet edge)
 * - Tight spacing (close to another item)
 * - Weight distribution (front/rear/left/right balance)
 */

import { PlacedCase } from "@/types/pallet-builder";

export type ItemWarning = "near_edge" | "tight_spacing";
export type ItemError = "collision" | "out_of_bounds" | "weight_violation";

export interface ItemValidation {
  warnings: ItemWarning[];
  errors: ItemError[];
}

export type WeightBalance = "balanced" | "front_heavy" | "rear_heavy" | "left_heavy" | "right_heavy";

export interface WeightDistribution {
  balance: WeightBalance;
  /** 0 = perfectly centered, 1 = fully off-center */
  severity: number;
  centerX: number;
  centerY: number;
}

const EDGE_THRESHOLD = 2; // inches
const SPACING_THRESHOLD = 1; // inch

/**
 * Compute per-item validation warnings and errors
 */
export function getItemValidation(
  item: PlacedCase,
  allItems: PlacedCase[],
  palletWidth: number,
  palletLength: number,
  strictMode: boolean
): ItemValidation {
  const warnings: ItemWarning[] = [];
  const errors: ItemError[] = [];

  const w = item.rotation === 90 || item.rotation === 270 ? item.length : item.width;
  const l = item.rotation === 90 || item.rotation === 270 ? item.width : item.length;

  // Out of bounds check
  if (item.x < 0 || item.y < 0 || item.x + w > palletWidth || item.y + l > palletLength) {
    errors.push("out_of_bounds");
  }

  // Near edge warning (only if not already out of bounds)
  if (errors.length === 0) {
    const nearLeft = item.x < EDGE_THRESHOLD;
    const nearTop = item.y < EDGE_THRESHOLD;
    const nearRight = (palletWidth - (item.x + w)) < EDGE_THRESHOLD;
    const nearBottom = (palletLength - (item.y + l)) < EDGE_THRESHOLD;
    if (nearLeft || nearTop || nearRight || nearBottom) {
      warnings.push("near_edge");
    }
  }

  // Tight spacing check — find nearest neighbor on same layer
  for (const other of allItems) {
    if (other.id === item.id || other.z !== item.z) continue;
    const ow = other.rotation === 90 || other.rotation === 270 ? other.length : other.width;
    const ol = other.rotation === 90 || other.rotation === 270 ? other.width : other.length;

    // Check collision
    const noOverlap = item.x + w <= other.x || item.x >= other.x + ow ||
                      item.y + l <= other.y || item.y >= other.y + ol;
    if (!noOverlap) {
      errors.push("collision");
      break;
    }

    // Gap calculation (minimum distance between edges)
    const gapX = Math.max(0, Math.max(other.x - (item.x + w), item.x - (other.x + ow)));
    const gapY = Math.max(0, Math.max(other.y - (item.y + l), item.y - (other.y + ol)));
    const gap = Math.min(
      gapX === 0 ? Infinity : gapX,
      gapY === 0 ? Infinity : gapY
    );
    // Only flag tight spacing if items are actually adjacent (not overlapping, gap exists)
    if (gap > 0 && gap <= SPACING_THRESHOLD) {
      if (!warnings.includes("tight_spacing")) {
        warnings.push("tight_spacing");
      }
    }
  }

  return { warnings, errors };
}

/**
 * Compute weight distribution across the pallet
 */
export function getWeightDistribution(
  items: PlacedCase[],
  palletWidth: number,
  palletLength: number
): WeightDistribution {
  if (items.length === 0) {
    return { balance: "balanced", severity: 0, centerX: 0.5, centerY: 0.5 };
  }

  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;

  for (const item of items) {
    const w = item.rotation === 90 || item.rotation === 270 ? item.length : item.width;
    const l = item.rotation === 90 || item.rotation === 270 ? item.width : item.length;
    const cx = item.x + w / 2;
    const cy = item.y + l / 2;
    weightedX += cx * item.weight;
    weightedY += cy * item.weight;
    totalWeight += item.weight;
  }

  if (totalWeight === 0) {
    return { balance: "balanced", severity: 0, centerX: 0.5, centerY: 0.5 };
  }

  // Normalized center of gravity (0-1, 0.5 = perfect center)
  const cogX = (weightedX / totalWeight) / palletWidth;
  const cogY = (weightedY / totalWeight) / palletLength;

  // Distance from center (0 = centered, ~0.5 = edge)
  const dx = cogX - 0.5;
  const dy = cogY - 0.5;
  const severity = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);

  // Determine dominant imbalance direction
  let balance: WeightBalance = "balanced";
  const threshold = 0.08; // 8% off-center to trigger

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > threshold) balance = "right_heavy";
    else if (dx < -threshold) balance = "left_heavy";
  } else {
    if (dy > threshold) balance = "rear_heavy";
    else if (dy < -threshold) balance = "front_heavy";
  }

  return { balance, severity, centerX: cogX, centerY: cogY };
}
