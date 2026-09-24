/**
 * Pallet Auto-Load Algorithm
 * 
 * Supports four placement strategies:
 * - best_fit:       Largest-area-first for tight packing
 * - max_quantity:    Smallest-first to fit the most items
 * - balanced_weight: Alternates placement across quadrants for even weight
 * - fast_unload:     Places items along edges for quick access
 * 
 * Respects:
 * - Pallet dimensions & weight limits
 * - Existing placed items (never moves them)
 * - Strict mode (no overhang when enabled)
 * - Item rotation preferences
 */

import { PlacedCase } from "@/types/pallet-builder";

export type AutoLoadStrategy = "best_fit" | "max_quantity" | "balanced_weight" | "fast_unload";

export const STRATEGY_META: Record<AutoLoadStrategy, { label: string; description: string }> = {
  best_fit: {
    label: "Best Fit",
    description: "Packs largest items first for optimal space usage",
  },
  max_quantity: {
    label: "Max Quantity",
    description: "Fits the most items possible by placing smallest first",
  },
  balanced_weight: {
    label: "Balanced Weight",
    description: "Distributes weight evenly across the pallet",
  },
  fast_unload: {
    label: "Fast Unload",
    description: "Places items along edges for quick access",
  },
};

export interface AutoLoadItem {
  id: string;
  name: string;
  width: number;
  length: number;
  height: number;
  weight: number;
  fragile?: boolean;
  allowRotation?: boolean;
  category?: string;
  condition?: string;
  source?: "item" | "container" | "case";
  sourceId?: string;
}

export interface AutoLoadConfig {
  palletWidth: number;
  palletLength: number;
  maxWeight: number;
  layer: number;
  strictMode: boolean;
  strategy: AutoLoadStrategy;
  /** Items already on the pallet — will not be moved */
  existingItems: PlacedCase[];
}

export interface AutoLoadResult {
  placed: PlacedCase[];
  unplaced: Array<{
    item: AutoLoadItem;
    reason: "too_large" | "no_space" | "weight_exceeded";
  }>;
  totalPlaced: number;
  totalUnplaced: number;
}

/**
 * Check if a rectangle collides with any existing rectangles on the same layer
 */
function collides(
  x: number,
  y: number,
  w: number,
  l: number,
  layer: number,
  occupied: PlacedCase[]
): boolean {
  for (const c of occupied) {
    if (c.z !== layer) continue;
    const cw = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
    const cl = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
    if (!(x + w <= c.x || x >= c.x + cw || y + l <= c.y || y >= c.y + cl)) {
      return true;
    }
  }
  return false;
}

/**
 * Standard scan: left-to-right, top-to-bottom
 */
function findPositionStandard(
  w: number,
  l: number,
  config: AutoLoadConfig,
  occupied: PlacedCase[]
): { x: number; y: number } | null {
  const { palletWidth, palletLength, layer } = config;
  if (w > palletWidth || l > palletLength) return null;

  for (let y = 0; y <= palletLength - l; y++) {
    for (let x = 0; x <= palletWidth - w; x++) {
      if (!collides(x, y, w, l, layer, occupied)) {
        return { x, y };
      }
    }
  }
  return null;
}

/**
 * Edge-priority scan: prefer positions along edges (for fast unload).
 * Scans perimeter first, then interior.
 */
function findPositionEdge(
  w: number,
  l: number,
  config: AutoLoadConfig,
  occupied: PlacedCase[]
): { x: number; y: number } | null {
  const { palletWidth, palletLength, layer } = config;
  if (w > palletWidth || l > palletLength) return null;

  const edgeThreshold = 4; // inches from edge to be considered "edge"

  // First pass: edge positions only
  for (let y = 0; y <= palletLength - l; y++) {
    for (let x = 0; x <= palletWidth - w; x++) {
      const isEdge = x < edgeThreshold || y < edgeThreshold ||
        (x + w) > (palletWidth - edgeThreshold) || (y + l) > (palletLength - edgeThreshold);
      if (isEdge && !collides(x, y, w, l, layer, occupied)) {
        return { x, y };
      }
    }
  }

  // Second pass: any position
  return findPositionStandard(w, l, config, occupied);
}

/**
 * Balanced placement: alternates between quadrants to distribute weight.
 * Uses a quadrant rotation approach: TL → TR → BR → BL
 */
function findPositionBalanced(
  w: number,
  l: number,
  config: AutoLoadConfig,
  occupied: PlacedCase[],
  itemIndex: number
): { x: number; y: number } | null {
  const { palletWidth, palletLength, layer } = config;
  if (w > palletWidth || l > palletLength) return null;

  const midX = Math.floor(palletWidth / 2);
  const midY = Math.floor(palletLength / 2);

  // Quadrant scan orders based on rotation
  type Range = { xStart: number; xEnd: number; xStep: number; yStart: number; yEnd: number; yStep: number };

  const quadrants: Range[] = [
    // Top-left
    { xStart: 0, xEnd: midX, xStep: 1, yStart: 0, yEnd: midY, yStep: 1 },
    // Top-right
    { xStart: palletWidth - w, xEnd: Math.max(midX - w, 0), xStep: -1, yStart: 0, yEnd: midY, yStep: 1 },
    // Bottom-right
    { xStart: palletWidth - w, xEnd: Math.max(midX - w, 0), xStep: -1, yStart: palletLength - l, yEnd: Math.max(midY - l, 0), yStep: -1 },
    // Bottom-left
    { xStart: 0, xEnd: midX, xStep: 1, yStart: palletLength - l, yEnd: Math.max(midY - l, 0), yStep: -1 },
  ];

  // Rotate starting quadrant based on item index
  const startQuadrant = itemIndex % 4;

  for (let q = 0; q < 4; q++) {
    const quadrant = quadrants[(startQuadrant + q) % 4];
    const yDir = quadrant.yStep;
    const xDir = quadrant.xStep;

    const yFrom = yDir > 0 ? quadrant.yStart : quadrant.yStart;
    const yTo = yDir > 0 ? quadrant.yEnd : quadrant.yEnd;
    const xFrom = xDir > 0 ? quadrant.xStart : quadrant.xStart;
    const xTo = xDir > 0 ? quadrant.xEnd : quadrant.xEnd;

    for (let y = yFrom; yDir > 0 ? y <= yTo : y >= yTo; y += yDir) {
      for (let x = xFrom; xDir > 0 ? x <= xTo : x >= xTo; x += xDir) {
        if (x >= 0 && y >= 0 && x + w <= palletWidth && y + l <= palletLength) {
          if (!collides(x, y, w, l, layer, occupied)) {
            return { x, y };
          }
        }
      }
    }
  }

  // Fallback to standard
  return findPositionStandard(w, l, config, occupied);
}

/**
 * Sort items based on strategy
 */
function sortByStrategy(items: AutoLoadItem[], strategy: AutoLoadStrategy): AutoLoadItem[] {
  const sorted = [...items];
  switch (strategy) {
    case "best_fit":
      // Largest area first
      return sorted.sort((a, b) => (b.width * b.length) - (a.width * a.length));
    case "max_quantity":
      // Smallest area first (pack more items)
      return sorted.sort((a, b) => (a.width * a.length) - (b.width * b.length));
    case "balanced_weight":
      // Heaviest first (place heavy items in alternating quadrants first)
      return sorted.sort((a, b) => b.weight - a.weight);
    case "fast_unload":
      // Largest first (big items along edges)
      return sorted.sort((a, b) => (b.width * b.length) - (a.width * a.length));
    default:
      return sorted;
  }
}

/**
 * Find position based on strategy
 */
function findPosition(
  w: number,
  l: number,
  config: AutoLoadConfig,
  occupied: PlacedCase[],
  itemIndex: number
): { x: number; y: number } | null {
  switch (config.strategy) {
    case "fast_unload":
      return findPositionEdge(w, l, config, occupied);
    case "balanced_weight":
      return findPositionBalanced(w, l, config, occupied, itemIndex);
    default:
      return findPositionStandard(w, l, config, occupied);
  }
}

/**
 * Run the auto-load algorithm with the selected strategy.
 */
export function autoLoadPallet(
  items: AutoLoadItem[],
  config: AutoLoadConfig
): AutoLoadResult {
  const placed: PlacedCase[] = [];
  const unplaced: AutoLoadResult["unplaced"] = [];

  let currentWeight = config.existingItems
    .reduce((sum, c) => sum + c.weight, 0);

  const occupied: PlacedCase[] = [...config.existingItems];
  const sorted = sortByStrategy(items, config.strategy);

  let placedIndex = 0;

  for (const item of sorted) {
    const fitsNormal = item.width <= config.palletWidth && item.length <= config.palletLength;
    const fitsRotated = item.length <= config.palletWidth && item.width <= config.palletLength;

    if (!fitsNormal && !fitsRotated) {
      unplaced.push({ item, reason: "too_large" });
      continue;
    }

    if (currentWeight + item.weight > config.maxWeight) {
      unplaced.push({ item, reason: "weight_exceeded" });
      continue;
    }

    let position: { x: number; y: number } | null = null;
    let rotation = 0;

    if (fitsNormal) {
      position = findPosition(item.width, item.length, config, occupied, placedIndex);
    }

    if (!position && fitsRotated && item.allowRotation !== false) {
      position = findPosition(item.length, item.width, config, occupied, placedIndex);
      if (position) {
        rotation = 90;
      }
    }

    if (!position) {
      unplaced.push({ item, reason: "no_space" });
      continue;
    }

    const placedCase: PlacedCase = {
      id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      caseId: item.name,
      caseType: item.category || "Standard",
      x: position.x,
      y: position.y,
      z: config.layer,
      rotation,
      width: item.width,
      length: item.length,
      height: item.height,
      weight: item.weight,
      condition: item.condition || "good",
      fragile: item.fragile || false,
      category: item.category || "General",
      allowRotation: item.allowRotation !== false,
      source: item.source,
      sourceId: item.sourceId,
    };

    placed.push(placedCase);
    occupied.push(placedCase);
    currentWeight += item.weight;
    placedIndex++;
  }

  return {
    placed,
    unplaced,
    totalPlaced: placed.length,
    totalUnplaced: unplaced.length,
  };
}

/* ─────────────────────────────────────────────────────────
 * Smart Layout — rearrange *already-placed* items on the
 * pallet for optimal space usage and weight balance.
 *
 * Algorithm:
 * 1. Sort deterministically: largest footprint first, then heaviest
 * 2. Place items in rows, alternating fill direction per row
 *    (left→right, then right→left) for natural weight balance
 * 3. Try rotation when an item doesn't fit in the current row
 * 4. Result is 100% deterministic — same inputs always produce
 *    the same output
 * ───────────────────────────────────────────────────────── */

export interface SmartLayoutConfig {
  palletWidth: number;
  palletLength: number;
  maxWeight: number;
  layer: number;
  strictMode: boolean;
  strategy?: AutoLoadStrategy;
}

export interface SmartLayoutResult {
  placed: PlacedCase[];
  unplaced: Array<{
    item: PlacedCase;
    reason: "too_large" | "no_space" | "weight_exceeded";
  }>;
  totalPlaced: number;
  totalUnplaced: number;
}

/**
 * Deterministic collision check using tolerance to allow edge-to-edge.
 */
function smartCollides(
  x: number, y: number, w: number, l: number,
  layer: number, occupied: PlacedCase[]
): boolean {
  const TOL = 0.1;
  for (const c of occupied) {
    if (c.z !== layer) continue;
    const cw = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
    const cl = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
    const ox = Math.min(x + w, c.x + cw) - Math.max(x, c.x);
    const oy = Math.min(y + l, c.y + cl) - Math.max(y, c.y);
    if (ox > TOL && oy > TOL) return true;
  }
  return false;
}

/**
 * Calculate center-of-gravity distance from pallet center.
 * Lower = more balanced.
 */
function cogDistanceFromCenter(
  placed: Array<{ x: number; y: number; w: number; l: number; weight: number }>,
  palletWidth: number,
  palletLength: number
): number {
  const cx = palletWidth / 2;
  const cy = palletLength / 2;
  let totalWeight = 0;
  let wx = 0;
  let wy = 0;
  for (const p of placed) {
    const itemCx = p.x + p.w / 2;
    const itemCy = p.y + p.l / 2;
    wx += itemCx * p.weight;
    wy += itemCy * p.weight;
    totalWeight += p.weight;
  }
  if (totalWeight === 0) return 0;
  const cogX = wx / totalWeight;
  const cogY = wy / totalWeight;
  return Math.sqrt((cogX - cx) ** 2 + (cogY - cy) ** 2);
}

/**
 * Find all non-colliding candidate positions on a coarse grid (step = 1 inch).
 * Returns up to `limit` candidates sorted by distance from pallet center.
 */
function findCandidatePositions(
  w: number, l: number,
  palletWidth: number, palletLength: number,
  layer: number, occupied: PlacedCase[],
  limit: number = 20
): Array<{ x: number; y: number }> {
  const cx = palletWidth / 2;
  const cy = palletLength / 2;
  const candidates: Array<{ x: number; y: number; dist: number }> = [];

  for (let y = 0; y <= palletLength - l; y++) {
    for (let x = 0; x <= palletWidth - w; x++) {
      if (!smartCollides(x, y, w, l, layer, occupied)) {
        // Distance of item center from pallet center — prefer center
        const dx = (x + w / 2) - cx;
        const dy = (y + l / 2) - cy;
        candidates.push({ x, y, dist: dx * dx + dy * dy });
      }
    }
  }

  // Sort by proximity to center, take top candidates
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates.slice(0, limit).map(c => ({ x: c.x, y: c.y }));
}

export function smartLayoutPallet(
  items: PlacedCase[],
  config: SmartLayoutConfig
): SmartLayoutResult {
  const placed: PlacedCase[] = [];
  const unplaced: SmartLayoutResult["unplaced"] = [];

  // 1. Deterministic sort: heaviest first, then largest footprint
  //    Heavy items placed first so balance algorithm has most leverage
  const sorted = [...items].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;       // heaviest first
    const areaA = a.width * a.length;
    const areaB = b.width * b.length;
    if (areaB !== areaA) return areaB - areaA;                   // largest second
    return a.id.localeCompare(b.id);                             // stable tiebreaker
  });

  let currentWeight = 0;
  const occupied: PlacedCase[] = [];

  // Running weighted sums for CoG tracking
  let weightedX = 0;
  let weightedY = 0;

  for (const item of sorted) {
    const fitsNormal = item.width <= config.palletWidth && item.length <= config.palletLength;
    const fitsRotated = item.length <= config.palletWidth && item.width <= config.palletLength;

    if (!fitsNormal && !fitsRotated) {
      unplaced.push({ item, reason: "too_large" });
      continue;
    }

    if (currentWeight + item.weight > config.maxWeight) {
      if (config.strictMode) {
        unplaced.push({ item, reason: "weight_exceeded" });
        continue;
      }
    }

    // Collect candidate positions for each valid orientation
    type Candidate = { x: number; y: number; rotation: number; w: number; l: number };
    const candidates: Candidate[] = [];

    if (fitsNormal) {
      for (const pos of findCandidatePositions(
        item.width, item.length,
        config.palletWidth, config.palletLength,
        config.layer, occupied
      )) {
        candidates.push({ ...pos, rotation: 0, w: item.width, l: item.length });
      }
    }

    if (fitsRotated && item.allowRotation !== false) {
      for (const pos of findCandidatePositions(
        item.length, item.width,
        config.palletWidth, config.palletLength,
        config.layer, occupied
      )) {
        candidates.push({ ...pos, rotation: 90, w: item.length, l: item.width });
      }
    }

    if (candidates.length === 0) {
      unplaced.push({ item, reason: "no_space" });
      continue;
    }

    // 2. Pick the candidate that best balances the overall CoG
    const palletCx = config.palletWidth / 2;
    const palletCy = config.palletLength / 2;

    let bestCandidate = candidates[0];
    let bestDist = Infinity;

    for (const c of candidates) {
      // Projected CoG if we place this item here
      const newWx = weightedX + (c.x + c.w / 2) * item.weight;
      const newWy = weightedY + (c.y + c.l / 2) * item.weight;
      const newTotalW = currentWeight + item.weight;
      const cogX = newWx / newTotalW;
      const cogY = newWy / newTotalW;
      const dist = (cogX - palletCx) ** 2 + (cogY - palletCy) ** 2;

      if (dist < bestDist) {
        bestDist = dist;
        bestCandidate = c;
      }
    }

    const rearrangedCase: PlacedCase = {
      ...item,
      x: bestCandidate.x,
      y: bestCandidate.y,
      z: config.layer,
      rotation: bestCandidate.rotation,
    };

    placed.push(rearrangedCase);
    occupied.push(rearrangedCase);
    weightedX += (bestCandidate.x + bestCandidate.w / 2) * item.weight;
    weightedY += (bestCandidate.y + bestCandidate.l / 2) * item.weight;
    currentWeight += item.weight;
  }

  return {
    placed,
    unplaced,
    totalPlaced: placed.length,
    totalUnplaced: unplaced.length,
  };
}
