/**
 * Intelligent Auto Pack Engine
 * 
 * Uses a Best-Fit Decreasing (BFD) shelf-packing algorithm with:
 * - Rotation optimization (tries both orientations)
 * - Weight-aware placement (alternates heavy loads L/R for balance)
 * - Configurable snap grid
 */

import { PlacedPallet } from "@/types/trailer-builder";
import { SavedPalletBuild } from "@/hooks/use-saved-pallet-builds";
import { CustomTrailer } from "@/hooks/use-custom-trailers";

export interface AutoPackConfig {
  /** Snap increment in inches */
  snapIncrement: number;
  /** Whether to allow 90° rotation */
  allowRotation: boolean;
  /** Whether to balance weight left/right */
  balanceWeight: boolean;
  /** Gap between pallets in inches (0 = touching) */
  spacing: number;
}

export interface AutoPackResult {
  placed: PlacedPallet[];
  totalPlaced: number;
  totalSkipped: number;
  skippedNames: string[];
  floorUtilization: number;
  totalWeight: number;
  remainingSpace: number;
}

const DEFAULT_CONFIG: AutoPackConfig = {
  snapIncrement: 6,
  allowRotation: true,
  balanceWeight: true,
  spacing: 0,
};

function snap(v: number, increment: number): number {
  return Math.round(v / increment) * increment;
}

function getPalletArea(p: SavedPalletBuild): number {
  const d = p.pallet_data.palletDimensions;
  return d.width * d.length;
}

function getPalletWeight(p: SavedPalletBuild): number {
  return p.pallet_data.placedCases.reduce((s, c) => s + (c.weight || 0), 0);
}

/**
 * Check if a rectangle at (x,y) with size (w,h) fits without collision.
 */
function fits(
  x: number, y: number, w: number, h: number,
  trailer: CustomTrailer,
  occupied: { x: number; y: number; w: number; h: number }[]
): boolean {
  // Bounds check
  if (x < 0 || y < 0 || x + w > trailer.width || y + h > trailer.length) return false;
  // Collision check
  const TOL = 0.1;
  for (const o of occupied) {
    const ox = Math.min(x + w, o.x + o.w) - Math.max(x, o.x);
    const oy = Math.min(y + h, o.y + o.h) - Math.max(y, o.y);
    if (ox > TOL && oy > TOL) return false;
  }
  return true;
}

/**
 * Try to place a pallet with given dimensions, returning position or null.
 * Uses a scan approach: iterate Y (front-to-back), then X (left-to-right or right-to-left).
 */
function findPosition(
  w: number, h: number,
  trailer: CustomTrailer,
  occupied: { x: number; y: number; w: number; h: number }[],
  config: AutoPackConfig,
  preferRight: boolean
): { x: number; y: number } | null {
  const step = config.snapIncrement;
  const gap = config.spacing;

  for (let y = 0; y + h <= trailer.length; y += step) {
    if (preferRight) {
      // Scan right to left
      for (let x = snap(trailer.width - w, step); x >= 0; x -= step) {
        if (fits(x, y, w + gap, h + gap, trailer, occupied) || fits(x, y, w, h, trailer, occupied)) {
          if (fits(x, y, w, h, trailer, occupied)) return { x, y };
        }
      }
    } else {
      // Scan left to right
      for (let x = 0; x + w <= trailer.width; x += step) {
        if (fits(x, y, w, h, trailer, occupied)) return { x, y };
      }
    }
  }
  return null;
}

/**
 * Run the auto-pack algorithm.
 * 
 * Strategy:
 * 1. Sort pallets by area (largest first) — Best Fit Decreasing
 * 2. For each pallet, try both orientations if allowed
 * 3. Alternate L/R placement for weight balance
 * 4. Track results
 */
export function autoPackTrailer(
  trailer: CustomTrailer,
  pallets: SavedPalletBuild[],
  existingPallets: PlacedPallet[] = [],
  config: Partial<AutoPackConfig> = {}
): AutoPackResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Sort by area descending (BFD heuristic)
  const sorted = [...pallets].sort((a, b) => getPalletArea(b) - getPalletArea(a));

  const occupied: { x: number; y: number; w: number; h: number }[] = [];
  const placed: PlacedPallet[] = [];
  const skippedNames: string[] = [];

  // Add existing pallets to occupied space
  for (const ep of existingPallets) {
    const d = ep.palletData.pallet_data.palletDimensions;
    const w = ep.rotation === 90 ? d.length : d.width;
    const h = ep.rotation === 90 ? d.width : d.length;
    occupied.push({ x: ep.x, y: ep.y, w, h });
    placed.push(ep);
  }

  let placedCount = 0;
  let alternateRight = false; // Toggle L/R for weight balance

  for (const pallet of sorted) {
    const d = pallet.pallet_data.palletDimensions;
    
    // Try both orientations
    const orientations: { w: number; h: number; rot: number }[] = [
      { w: d.width, h: d.length, rot: 0 },
    ];
    if (cfg.allowRotation && d.width !== d.length) {
      orientations.push({ w: d.length, h: d.width, rot: 90 });
    }

    let bestPos: { x: number; y: number; rot: number } | null = null;

    for (const ori of orientations) {
      const pos = findPosition(
        ori.w, ori.h, trailer, occupied, cfg,
        cfg.balanceWeight ? alternateRight : false
      );
      if (pos) {
        bestPos = { x: pos.x, y: pos.y, rot: ori.rot };
        break;
      }
    }

    // If preferred side failed, try opposite
    if (!bestPos && cfg.balanceWeight) {
      for (const ori of orientations) {
        const pos = findPosition(
          ori.w, ori.h, trailer, occupied, cfg,
          !alternateRight
        );
        if (pos) {
          bestPos = { x: pos.x, y: pos.y, rot: ori.rot };
          break;
        }
      }
    }

    if (bestPos) {
      const ori = orientations.find(o => o.rot === bestPos!.rot) || orientations[0];
      const newPallet: PlacedPallet = {
        id: crypto.randomUUID(),
        palletId: pallet.id,
        x: bestPos.x,
        y: bestPos.y,
        rotation: bestPos.rot,
        palletData: pallet,
      };
      placed.push(newPallet);
      occupied.push({ x: bestPos.x, y: bestPos.y, w: ori.w, h: ori.h });
      placedCount++;
      alternateRight = !alternateRight;
    } else {
      skippedNames.push(pallet.name);
    }
  }

  // Calculate metrics
  const totalArea = trailer.width * trailer.length;
  const usedArea = occupied.reduce((s, o) => s + o.w * o.h, 0);
  const totalWeight = placed.reduce((s, p) => s + getPalletWeight(p.palletData), 0);

  return {
    placed,
    totalPlaced: placedCount,
    totalSkipped: skippedNames.length,
    skippedNames,
    floorUtilization: Math.round((usedArea / totalArea) * 1000) / 10,
    totalWeight,
    remainingSpace: totalArea - usedArea,
  };
}
