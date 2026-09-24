/**
 * Trailer Load Intelligence Engine
 * 
 * Analyzes trailer layouts and produces optimization recommendations
 * with actionable suggestions that can be auto-applied.
 * Includes stop-based delivery sequencing analysis.
 */

import { PlacedPallet } from "@/types/trailer-builder";
import { CustomTrailer } from "@/hooks/use-custom-trailers";

// --- Types ---

export type EfficiencyGrade = "A+" | "A" | "B" | "C" | "D" | "F";

export interface SequenceAnalysis {
  totalStops: number;
  totalLoadsWithStops: number;
  sequenceEfficiency: number; // 0-100
  blockingIssues: BlockingIssue[];
  stopSummary: { stop: number; count: number; avgY: number; destination?: string }[];
}

export interface BlockingIssue {
  blockedPalletId: string;
  blockedPalletName: string;
  blockedStop: number;
  blockerPalletId: string;
  blockerPalletName: string;
  blockerStop: number;
}

export interface WeightDistribution {
  totalWeight: number;
  frontAxleLoad: number;
  rearAxleLoad: number;
  frontAxlePercent: number;
  rearAxlePercent: number;
  leftSideLoad: number;
  rightSideLoad: number;
  leftSidePercent: number;
  rightSidePercent: number;
  cogX: number; // 0-1 normalized
  cogY: number; // 0-1 normalized
  isBalanced: boolean;
  /** Zone weights: divide trailer into a 3x2 grid */
  zones: { label: string; weight: number; percent: number }[];
  warnings: WeightWarning[];
}

export interface WeightWarning {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  affectedPalletIds?: string[];
}

export interface LoadMetrics {
  spaceUtilization: number;
  weightUtilization: number;
  loadEfficiencyScore: number;
  grade: EfficiencyGrade;
  totalWeight: number;
  remainingWeight: number;
  usedArea: number;
  totalArea: number;
  remainingArea: number;
  palletCount: number;
  estimatedAdditionalPallets: number;
  weightBalance: {
    frontWeight: number;
    rearWeight: number;
    leftWeight: number;
    rightWeight: number;
    cogX: number;
    cogY: number;
    isBalanced: boolean;
  };
  sequence?: SequenceAnalysis;
  weightDistribution?: WeightDistribution;
}

export type RecommendationType =
  | "move_forward"
  | "move_backward"
  | "move_left"
  | "move_right"
  | "rotate"
  | "consolidate_gap"
  | "weight_balance"
  | "additional_capacity"
  | "stack_opportunity"
  | "sequence_warning"
  | "sequence_optimize";

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  palletId?: string;
  palletName?: string;
  appliedUpdate?: {
    palletId: string;
    updates: Partial<PlacedPallet>;
  };
  /** For bulk operations (like optimize delivery order) */
  bulkUpdates?: { palletId: string; updates: Partial<PlacedPallet> }[];
}

// --- Helpers ---

export function getPalletDims(p: PlacedPallet) {
  const d = p.palletData.pallet_data.palletDimensions;
  return p.rotation === 90
    ? { w: d.length, h: d.width }
    : { w: d.width, h: d.length };
}

export function getPalletWeight(p: PlacedPallet): number {
  return p.palletData.pallet_data.placedCases.reduce((s, c) => s + (c.weight || 0), 0);
}

// --- Weight Distribution Analysis ---

export function analyzeWeightDistribution(
  trailer: CustomTrailer,
  pallets: PlacedPallet[]
): WeightDistribution {
  const midX = trailer.width / 2;
  const midY = trailer.length / 2;
  const thirdY = trailer.length / 3;

  let totalWeight = 0;
  let frontAxleLoad = 0;
  let rearAxleLoad = 0;
  let leftSideLoad = 0;
  let rightSideLoad = 0;
  let weightedX = 0;
  let weightedY = 0;

  const zoneWeights = [0, 0, 0, 0, 0, 0];
  const zoneLabels = ["Front Left", "Front Right", "Mid Left", "Mid Right", "Rear Left", "Rear Right"];

  for (const p of pallets) {
    const dims = getPalletDims(p);
    const w = getPalletWeight(p);
    const cx = p.x + dims.w / 2;
    const cy = p.y + dims.h / 2;

    totalWeight += w;
    weightedX += cx * w;
    weightedY += cy * w;

    if (cy < midY) frontAxleLoad += w; else rearAxleLoad += w;
    if (cx < midX) leftSideLoad += w; else rightSideLoad += w;

    const isLeft = cx < midX;
    let row: number;
    if (cy < thirdY) row = 0;
    else if (cy < thirdY * 2) row = 1;
    else row = 2;
    zoneWeights[row * 2 + (isLeft ? 0 : 1)] += w;
  }

  const cogX = totalWeight > 0 ? (weightedX / totalWeight) / trailer.width : 0.5;
  const cogY = totalWeight > 0 ? (weightedY / totalWeight) / trailer.length : 0.5;
  const isBalanced = Math.abs(cogX - 0.5) < 0.15 && Math.abs(cogY - 0.5) < 0.15;

  const frontPercent = totalWeight > 0 ? (frontAxleLoad / totalWeight) * 100 : 50;
  const rearPercent = totalWeight > 0 ? (rearAxleLoad / totalWeight) * 100 : 50;
  const leftPercent = totalWeight > 0 ? (leftSideLoad / totalWeight) * 100 : 50;
  const rightPercent = totalWeight > 0 ? (rightSideLoad / totalWeight) * 100 : 50;

  const zones = zoneLabels.map((label, i) => ({
    label, weight: zoneWeights[i],
    percent: totalWeight > 0 ? (zoneWeights[i] / totalWeight) * 100 : 0,
  }));

  const warnings: WeightWarning[] = [];
  let warnIdx = 0;

  if (frontPercent > 65) {
    warnings.push({ id: `ww-${warnIdx++}`, severity: "critical", title: "Front axle overload risk",
      description: `${frontPercent.toFixed(0)}% of weight is on the front axle. Redistribute toward the rear.` });
  } else if (frontPercent > 55) {
    warnings.push({ id: `ww-${warnIdx++}`, severity: "warning", title: "Front-heavy load",
      description: `${frontPercent.toFixed(0)}% of weight is on the front. Consider moving loads rearward.` });
  }

  if (rearPercent > 65) {
    warnings.push({ id: `ww-${warnIdx++}`, severity: "critical", title: "Rear axle overload risk",
      description: `${rearPercent.toFixed(0)}% of weight is on the rear axle. Redistribute toward the front.` });
  } else if (rearPercent > 55) {
    warnings.push({ id: `ww-${warnIdx++}`, severity: "warning", title: "Rear-heavy load",
      description: `${rearPercent.toFixed(0)}% of weight is on the rear. Consider moving loads forward.` });
  }

  if (Math.abs(leftPercent - rightPercent) > 30) {
    warnings.push({ id: `ww-${warnIdx++}`, severity: "critical", title: "Unbalanced trailer load",
      description: `Left/Right split is ${leftPercent.toFixed(0)}%/${rightPercent.toFixed(0)}%. Risk of trailer sway.` });
  } else if (Math.abs(leftPercent - rightPercent) > 15) {
    warnings.push({ id: `ww-${warnIdx++}`, severity: "warning", title: "Lateral imbalance detected",
      description: `Left/Right split is ${leftPercent.toFixed(0)}%/${rightPercent.toFixed(0)}%. Try to center the load.` });
  }

  if (totalWeight > trailer.max_weight) {
    warnings.push({ id: `ww-${warnIdx++}`, severity: "critical", title: "Weight limit exceeded",
      description: `Over limit by ${(totalWeight - trailer.max_weight).toLocaleString()} lbs.` });
  } else if (totalWeight > trailer.max_weight * 0.9) {
    warnings.push({ id: `ww-${warnIdx++}`, severity: "info", title: "Approaching weight limit",
      description: `${((totalWeight / trailer.max_weight) * 100).toFixed(0)}% of max capacity used.` });
  }

  return {
    totalWeight, frontAxleLoad, rearAxleLoad,
    frontAxlePercent: Math.round(frontPercent * 10) / 10,
    rearAxlePercent: Math.round(rearPercent * 10) / 10,
    leftSideLoad, rightSideLoad,
    leftSidePercent: Math.round(leftPercent * 10) / 10,
    rightSidePercent: Math.round(rightPercent * 10) / 10,
    cogX, cogY, isBalanced, zones, warnings,
  };
}
function getGrade(score: number): EfficiencyGrade {
  if (score >= 92) return "A+";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

export function hasCollision(
  x: number, y: number, w: number, h: number,
  pallets: PlacedPallet[], excludeId: string
): boolean {
  const TOL = 0.1;
  return pallets.some(p => {
    if (p.id === excludeId) return false;
    const d = getPalletDims(p);
    const ox = Math.min(x + w, p.x + d.w) - Math.max(x, p.x);
    const oy = Math.min(y + h, p.y + d.h) - Math.max(y, p.y);
    return ox > TOL && oy > TOL;
  });
}

export function inBounds(x: number, y: number, w: number, h: number, trailer: CustomTrailer): boolean {
  return x >= 0 && y >= 0 && x + w <= trailer.width && y + h <= trailer.length;
}

// --- Sequence Analysis ---

/**
 * Analyzes delivery stop sequencing.
 * Door is at bottom (high Y). Stop 1 should be nearest door (highest Y).
 * Later stops should be deeper (lower Y).
 */
export function analyzeSequence(
  trailer: CustomTrailer,
  pallets: PlacedPallet[]
): SequenceAnalysis {
  const withStops = pallets.filter(p => p.stopNumber && p.stopNumber > 0);
  if (withStops.length === 0) {
    return { totalStops: 0, totalLoadsWithStops: 0, sequenceEfficiency: 100, blockingIssues: [], stopSummary: [] };
  }

  const stops = [...new Set(withStops.map(p => p.stopNumber!))].sort((a, b) => a - b);

  // Build stop summary
  const stopSummary = stops.map(stop => {
    const members = withStops.filter(p => p.stopNumber === stop);
    const avgY = members.reduce((s, p) => s + p.y + getPalletDims(p).h / 2, 0) / members.length;
    const dest = members.find(p => p.destination)?.destination;
    return { stop, count: members.length, avgY, destination: dest };
  });

  // Blocking detection: a pallet at stop N is "blocked" if a pallet at stop M (M > N)
  // is between it and the door (higher Y or overlapping Y range, same X lane)
  const blockingIssues: BlockingIssue[] = [];

  for (const early of withStops) {
    const earlyDims = getPalletDims(early);
    const earlyBottom = early.y + earlyDims.h; // bottom edge (door side)
    const earlyLeft = early.x;
    const earlyRight = early.x + earlyDims.w;

    for (const later of withStops) {
      if (later.id === early.id) continue;
      if (later.stopNumber! <= early.stopNumber!) continue; // only check later stops blocking earlier

      const laterDims = getPalletDims(later);
      const laterTop = later.y;
      const laterLeft = later.x;
      const laterRight = later.x + laterDims.w;

      // Check if later pallet is between early pallet and the door (bottom)
      // Later pallet must be below (higher Y) the early pallet
      // AND overlap in X axis (same lane)
      const xOverlap = Math.min(earlyRight, laterRight) - Math.max(earlyLeft, laterLeft);
      if (xOverlap > 0.1 && laterTop >= earlyBottom - 0.1) {
        blockingIssues.push({
          blockedPalletId: early.id,
          blockedPalletName: early.palletData.name,
          blockedStop: early.stopNumber!,
          blockerPalletId: later.id,
          blockerPalletName: later.palletData.name,
          blockerStop: later.stopNumber!,
        });
      }
    }
  }

  // Sequence efficiency: based on correct ordering (stop 1 nearest door = highest avgY)
  // Perfect = each stop's avgY decreases as stop number increases (lower Y = deeper)
  // Wait — door is at bottom, so stop 1 should have HIGHEST Y (nearest bottom)
  let correctPairs = 0;
  let totalPairs = 0;
  for (let i = 0; i < stopSummary.length; i++) {
    for (let j = i + 1; j < stopSummary.length; j++) {
      totalPairs++;
      // Earlier stop should have higher avgY (closer to door at bottom)
      if (stopSummary[i].avgY > stopSummary[j].avgY) {
        correctPairs++;
      }
    }
  }

  const pairScore = totalPairs > 0 ? (correctPairs / totalPairs) * 100 : 100;
  const blockingPenalty = Math.min(50, blockingIssues.length * 15);
  const sequenceEfficiency = Math.max(0, Math.round(pairScore - blockingPenalty));

  return {
    totalStops: stops.length,
    totalLoadsWithStops: withStops.length,
    sequenceEfficiency,
    blockingIssues,
    stopSummary,
  };
}

/**
 * Auto-optimize layout for delivery order.
 * Sorts pallets by stop number (stop 1 nearest door = bottom).
 * Uses a greedy bottom-up strip-packing approach.
 */
export function optimizeForDeliveryOrder(
  trailer: CustomTrailer,
  pallets: PlacedPallet[]
): { palletId: string; updates: Partial<PlacedPallet> }[] {
  if (pallets.length === 0) return [];

  // Separate pallets with stops and without
  const withStops = pallets.filter(p => p.stopNumber && p.stopNumber > 0);
  const withoutStops = pallets.filter(p => !p.stopNumber || p.stopNumber <= 0);

  // Sort: stop 1 goes last in placement order (placed at bottom/door)
  // We place from bottom (door) up (cab), so stop 1 first, then 2, etc.
  const sorted = [
    ...withStops.sort((a, b) => a.stopNumber! - b.stopNumber!),
    ...withoutStops, // no-stop pallets go deepest (cab side)
  ];

  const updates: { palletId: string; updates: Partial<PlacedPallet> }[] = [];
  const placed: { id: string; x: number; y: number; w: number; h: number }[] = [];

  // Place from door (bottom = trailer.length) upward
  let currentY = trailer.length;
  let rowX = 0;
  let rowMaxH = 0;

  for (const p of sorted) {
    const dims = getPalletDims(p);
    const w = dims.w;
    const h = dims.h;

    // Try to fit in current row
    if (rowX + w > trailer.width) {
      // Move to next row (upward)
      currentY -= rowMaxH;
      rowX = 0;
      rowMaxH = 0;
    }

    const placeY = currentY - h;
    const placeX = rowX;

    if (placeY < 0 || placeX + w > trailer.width) {
      // Doesn't fit — skip (keep original position)
      continue;
    }

    // Check collision with already-placed
    const collides = placed.some(pp => {
      const ox = Math.min(placeX + w, pp.x + pp.w) - Math.max(placeX, pp.x);
      const oy = Math.min(placeY + h, pp.y + pp.h) - Math.max(placeY, pp.y);
      return ox > 0.1 && oy > 0.1;
    });

    if (!collides) {
      updates.push({ palletId: p.id, updates: { x: placeX, y: placeY } });
      placed.push({ id: p.id, x: placeX, y: placeY, w, h });
      rowX += w;
      rowMaxH = Math.max(rowMaxH, h);
    }
  }

  return updates;
}

// --- Core Analysis ---

export function analyzeLoad(
  trailer: CustomTrailer,
  pallets: PlacedPallet[]
): LoadMetrics {
  const totalArea = trailer.width * trailer.length;

  let usedArea = 0;
  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;
  let frontWeight = 0;
  let rearWeight = 0;
  let leftWeight = 0;
  let rightWeight = 0;

  const midY = trailer.length / 2;
  const midX = trailer.width / 2;

  for (const p of pallets) {
    const dims = getPalletDims(p);
    const w = getPalletWeight(p);
    const cx = p.x + dims.w / 2;
    const cy = p.y + dims.h / 2;

    usedArea += dims.w * dims.h;
    totalWeight += w;
    weightedX += cx * w;
    weightedY += cy * w;

    if (cy < midY) frontWeight += w; else rearWeight += w;
    if (cx < midX) leftWeight += w; else rightWeight += w;
  }

  const cogX = totalWeight > 0 ? (weightedX / totalWeight) / trailer.width : 0.5;
  const cogY = totalWeight > 0 ? (weightedY / totalWeight) / trailer.length : 0.5;
  const isBalanced = Math.abs(cogX - 0.5) < 0.15 && Math.abs(cogY - 0.5) < 0.15;

  const spaceUtilization = (usedArea / totalArea) * 100;
  const weightUtilization = (totalWeight / trailer.max_weight) * 100;

  const balanceScore = Math.max(0, 100 - Math.sqrt(
    Math.pow((cogX - 0.5) * 200, 2) + Math.pow((cogY - 0.5) * 200, 2)
  ));
  const loadEfficiencyScore = Math.round(
    spaceUtilization * 0.5 +
    Math.min(weightUtilization, 100) * 0.3 +
    balanceScore * 0.2
  );

  const avgPalletArea = pallets.length > 0
    ? usedArea / pallets.length
    : (48 * 40);
  const remainingArea = totalArea - usedArea;
  const estimatedAdditionalPallets = Math.max(0, Math.floor(remainingArea / avgPalletArea));

  // Sequence analysis
  const sequence = analyzeSequence(trailer, pallets);

  // Weight distribution
  const weightDistribution = analyzeWeightDistribution(trailer, pallets);

  return {
    spaceUtilization: Math.round(spaceUtilization * 10) / 10,
    weightUtilization: Math.round(weightUtilization * 10) / 10,
    loadEfficiencyScore,
    grade: getGrade(loadEfficiencyScore),
    totalWeight,
    remainingWeight: Math.max(0, trailer.max_weight - totalWeight),
    usedArea,
    totalArea,
    remainingArea,
    palletCount: pallets.length,
    estimatedAdditionalPallets,
    weightBalance: {
      frontWeight, rearWeight, leftWeight, rightWeight,
      cogX, cogY, isBalanced,
    },
    sequence,
    weightDistribution,
  };
}

// --- Recommendations ---

export function generateRecommendations(
  trailer: CustomTrailer,
  pallets: PlacedPallet[]
): Recommendation[] {
  if (pallets.length === 0) return [];

  const recs: Recommendation[] = [];
  const metrics = analyzeLoad(trailer, pallets);
  let recIdx = 0;

  // 0. Sequence blocking warnings
  if (metrics.sequence && metrics.sequence.blockingIssues.length > 0) {
    for (const issue of metrics.sequence.blockingIssues.slice(0, 3)) {
      recs.push({
        id: `rec-${recIdx++}`,
        type: "sequence_warning",
        priority: "high",
        title: `Stop ${issue.blockedStop} blocked by Stop ${issue.blockerStop}`,
        description: `"${issue.blockedPalletName}" (Stop ${issue.blockedStop}) cannot be unloaded because "${issue.blockerPalletName}" (Stop ${issue.blockerStop}) is in the way.`,
        palletId: issue.blockedPalletId,
        palletName: issue.blockedPalletName,
      });
    }
  }

  // 0b. Sequence optimize suggestion
  const hasStops = pallets.some(p => p.stopNumber && p.stopNumber > 0);
  if (hasStops && metrics.sequence && metrics.sequence.sequenceEfficiency < 80) {
    const bulkUpdates = optimizeForDeliveryOrder(trailer, pallets);
    if (bulkUpdates.length > 0) {
      recs.push({
        id: `rec-${recIdx++}`,
        type: "sequence_optimize",
        priority: "high",
        title: "Optimize for delivery order",
        description: `Sequence efficiency is ${metrics.sequence.sequenceEfficiency}%. Auto-arrange loads so earlier stops are near the door.`,
        bulkUpdates,
      });
    }
  }

  // 1. Weight balance recommendations
  const { cogX, cogY, isBalanced } = metrics.weightBalance;

  if (!isBalanced && pallets.length >= 2) {
    const midX = trailer.width / 2;
    const midY = trailer.length / 2;

    const sorted = [...pallets].sort((a, b) => {
      const aDims = getPalletDims(a);
      const bDims = getPalletDims(b);
      const aCx = a.x + aDims.w / 2;
      const aCy = a.y + aDims.h / 2;
      const bCx = b.x + bDims.w / 2;
      const bCy = b.y + bDims.h / 2;
      const aDist = Math.abs(aCx - midX) + Math.abs(aCy - midY);
      const bDist = Math.abs(bCx - midX) + Math.abs(bCy - midY);
      return bDist - aDist;
    });

    const worstPallet = sorted[0];
    const dims = getPalletDims(worstPallet);

    let direction: "forward" | "backward" | "left" | "right" = "forward";
    let newX = worstPallet.x;
    let newY = worstPallet.y;

    if (Math.abs(cogY - 0.5) > Math.abs(cogX - 0.5)) {
      if (cogY > 0.5) {
        direction = "forward";
        newY = Math.max(0, worstPallet.y - Math.min(24, worstPallet.y));
      } else {
        direction = "backward";
        newY = Math.min(trailer.length - dims.h, worstPallet.y + 24);
      }
    } else {
      if (cogX > 0.5) {
        direction = "left";
        newX = Math.max(0, worstPallet.x - Math.min(24, worstPallet.x));
      } else {
        direction = "right";
        newX = Math.min(trailer.width - dims.w, worstPallet.x + 24);
      }
    }

    if (inBounds(newX, newY, dims.w, dims.h, trailer) &&
        !hasCollision(newX, newY, dims.w, dims.h, pallets, worstPallet.id)) {
      recs.push({
        id: `rec-${recIdx++}`,
        type: `move_${direction}` as RecommendationType,
        priority: "high",
        title: `Move "${worstPallet.palletData.name}" ${direction}`,
        description: `Improves weight balance by shifting load toward center.`,
        palletId: worstPallet.id,
        palletName: worstPallet.palletData.name,
        appliedUpdate: {
          palletId: worstPallet.id,
          updates: { x: newX, y: newY },
        },
      });
    }
  }

  // 2. Gap consolidation
  for (const p of pallets) {
    const dims = getPalletDims(p);
    let bestY = p.y;
    for (let tryY = 0; tryY <= p.y - 6; tryY += 6) {
      if (inBounds(p.x, tryY, dims.w, dims.h, trailer) &&
          !hasCollision(p.x, tryY, dims.w, dims.h, pallets, p.id)) {
        bestY = tryY;
        break;
      }
    }
    if (bestY < p.y - 12) {
      recs.push({
        id: `rec-${recIdx++}`,
        type: "consolidate_gap",
        priority: "medium",
        title: `Move "${p.palletData.name}" forward to close gap`,
        description: `${Math.round(p.y - bestY)}" of wasted space can be recovered.`,
        palletId: p.id,
        palletName: p.palletData.name,
        appliedUpdate: { palletId: p.id, updates: { y: bestY } },
      });
    }
  }

  // 3. Rotation opportunities
  for (const p of pallets) {
    const origDims = getPalletDims(p);
    if (origDims.w === origDims.h) continue;
    const newRot = p.rotation === 0 ? 90 : 0;
    const d = p.palletData.pallet_data.palletDimensions;
    const rotW = newRot === 90 ? d.length : d.width;
    const rotH = newRot === 90 ? d.width : d.length;
    if (!inBounds(p.x, p.y, rotW, rotH, trailer)) continue;
    if (hasCollision(p.x, p.y, rotW, rotH, pallets, p.id)) continue;
    const widthGain = origDims.w - rotW;
    const lengthGain = origDims.h - rotH;
    if (widthGain > 6 || lengthGain > 6) {
      const axis = widthGain > lengthGain ? "width" : "length";
      recs.push({
        id: `rec-${recIdx++}`,
        type: "rotate",
        priority: "low",
        title: `Rotate "${p.palletData.name}" to free ${axis}`,
        description: `Rotating saves ${Math.abs(axis === "width" ? widthGain : lengthGain)}" of ${axis}.`,
        palletId: p.id,
        palletName: p.palletData.name,
        appliedUpdate: { palletId: p.id, updates: { rotation: newRot } },
      });
    }
  }

  // 4. Additional capacity
  if (metrics.estimatedAdditionalPallets > 0 && metrics.spaceUtilization < 85) {
    recs.push({
      id: `rec-${recIdx++}`,
      type: "additional_capacity",
      priority: metrics.spaceUtilization < 50 ? "high" : "medium",
      title: `~${metrics.estimatedAdditionalPallets} more pallet${metrics.estimatedAdditionalPallets > 1 ? "s" : ""} could fit`,
      description: `${metrics.remainingArea.toLocaleString()} sq inches of floor space remain.`,
    });
  }

  // 5. Weight warning
  if (metrics.weightUtilization > 90 && metrics.weightUtilization <= 100) {
    recs.push({
      id: `rec-${recIdx++}`,
      type: "weight_balance",
      priority: "high",
      title: "Approaching max weight capacity",
      description: `Current load is ${metrics.weightUtilization.toFixed(1)}% of maximum.`,
    });
  } else if (metrics.weightUtilization > 100) {
    recs.push({
      id: `rec-${recIdx++}`,
      type: "weight_balance",
      priority: "high",
      title: "⚠️ Weight limit exceeded",
      description: `Exceeds max by ${(metrics.totalWeight - trailer.max_weight).toLocaleString()} lbs.`,
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recs;
}
