/**
 * Pallet gravity & support engine.
 *
 * Guarantees that a placed case is ALWAYS in one of two states:
 *   1. resting on the pallet deck (layer 1), or
 *   2. resting fully on top of other cases (>= MIN_SUPPORT of its bottom face).
 *
 * Boxes can never float: every mutation should be passed through
 * {@link settleAll}, and every candidate position through {@link settleLayer}.
 *
 * Layers are discrete indexes (1 = deck). Actual world Y is derived from the
 * real supporting boxes via {@link computeBaseYMap}, so a box's visual height
 * always matches what is physically underneath it.
 */
import type { PlacedCase } from "@/types/pallet-builder";

/** Fraction of the bottom face that must be supported. */
export const MIN_SUPPORT = 0.95;

type Foot = { x: number; y: number; w: number; l: number };

/** Axis-aligned footprint of a case (accounts for 90/270 yaw). */
export function footprintOf(c: Pick<PlacedCase, "width" | "length" | "rotation">) {
  const rotated = c.rotation === 90 || c.rotation === 270;
  return { w: rotated ? c.length : c.width, l: rotated ? c.width : c.length };
}

function foot(c: PlacedCase): Foot {
  const { w, l } = footprintOf(c);
  return { x: c.x, y: c.y, w, l };
}

function overlapArea(a: Foot, b: Foot): number {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.l, b.y + b.l) - Math.max(a.y, b.y);
  return ox > 0 && oy > 0 ? ox * oy : 0;
}

/** Do two footprints intersect (with a small tolerance)? */
export function footprintsIntersect(a: Foot, b: Foot, tol = 0.1): boolean {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.l, b.y + b.l) - Math.max(a.y, b.y);
  return ox > tol && oy > tol;
}

/** Is the footprint fully inside the pallet? */
export function withinPallet(
  f: Foot,
  palletWidth: number,
  palletLength: number,
  tol = 0.001
): boolean {
  return (
    f.x >= -tol &&
    f.y >= -tol &&
    f.x + f.w <= palletWidth + tol &&
    f.y + f.l <= palletLength + tol
  );
}

/** Does a candidate collide with anything already on `layer`? */
export function collidesAtLayer(
  cases: PlacedCase[],
  f: Foot,
  layer: number,
  excludeId?: string
): boolean {
  return cases.some(
    (c) => c.id !== excludeId && c.z === layer && footprintsIntersect(f, foot(c))
  );
}

/**
 * Fraction of the candidate footprint supported from below.
 * Layer 1 rests on the deck → always fully supported.
 */
export function supportRatio(
  cases: PlacedCase[],
  f: Foot,
  layer: number,
  excludeId?: string
): number {
  if (layer <= 1) return 1;
  const area = f.w * f.l;
  if (area <= 0) return 0;
  let covered = 0;
  for (const c of cases) {
    if (c.id === excludeId) continue;
    if (c.z !== layer - 1) continue;
    covered += overlapArea(f, foot(c));
  }
  return Math.min(1, covered / area);
}

/**
 * Gravity: return the LOWEST layer where the footprint neither collides nor
 * floats, scanning up from the deck. `null` when nothing valid exists.
 */
export function settleLayer(
  cases: PlacedCase[],
  f: Foot,
  excludeId?: string,
  maxLayers?: number
): number | null {
  const top = cases.reduce((m, c) => (c.id === excludeId ? m : Math.max(m, c.z)), 0);
  const limit = Math.max(1, maxLayers ?? top + 1);
  for (let layer = 1; layer <= limit; layer++) {
    if (collidesAtLayer(cases, f, layer, excludeId)) continue;
    if (supportRatio(cases, f, layer, excludeId) + 1e-6 < MIN_SUPPORT) continue;
    return layer;
  }
  return null;
}

/** Lowest layer with no intersection, ignoring support (last-resort fallback). */
export function firstFreeLayer(cases: PlacedCase[], f: Foot, excludeId?: string): number {
  const top = cases.reduce((m, c) => (c.id === excludeId ? m : Math.max(m, c.z)), 0);
  for (let layer = 1; layer <= top + 1; layer++) {
    if (!collidesAtLayer(cases, f, layer, excludeId)) return layer;
  }
  return top + 1;
}

export interface PlacementCheck {
  ok: boolean;
  layer: number | null;
  reason?: string;
}

/** Full validation pass for a candidate footprint. */
export function validatePlacement(
  cases: PlacedCase[],
  f: Foot,
  palletWidth: number,
  palletLength: number,
  excludeId?: string
): PlacementCheck {
  if (!withinPallet(f, palletWidth, palletLength)) {
    return { ok: false, layer: null, reason: "Outside the pallet footprint" };
  }
  const layer = settleLayer(cases, f, excludeId);
  if (layer == null) {
    return { ok: false, layer: null, reason: "Nothing solid underneath — needs full support" };
  }
  return { ok: true, layer };
}

/**
 * Settle every case so the whole stack is gravity-consistent: no floaters,
 * no intersections. Processed bottom-up so lower boxes settle first.
 */
export function settleAll(cases: PlacedCase[]): PlacedCase[] {
  const ordered = [...cases].sort((a, b) => a.z - b.z);
  const settled: PlacedCase[] = [];
  for (const c of ordered) {
    const f = foot(c);
    const layer = settleLayer(settled, f, c.id) ?? firstFreeLayer(settled, f, c.id);
    settled.push({ ...c, z: layer });
  }
  // Preserve the caller's original array order for stable React keys/diffs.
  const byId = new Map(settled.map((c) => [c.id, c]));
  return cases.map((c) => byId.get(c.id) ?? c);
}

/**
 * Real world Y (bottom face height, inches) per case id: deck height plus the
 * tallest supporting box directly underneath it.
 */
export function computeBaseYMap(cases: PlacedCase[], deckHeight: number): Map<string, number> {
  const map = new Map<string, number>();
  const ordered = [...cases].sort((a, b) => a.z - b.z);
  for (const c of ordered) {
    const f = foot(c);
    let base = deckHeight;
    for (const b of ordered) {
      if (b.id === c.id || b.z >= c.z) continue;
      if (!footprintsIntersect(f, foot(b))) continue;
      base = Math.max(base, (map.get(b.id) ?? deckHeight) + (b.height || 0));
    }
    map.set(c.id, base);
  }
  return map;
}

/** Bottom-face Y for a hypothetical footprint at `layer` (drag previews). */
export function baseYFor(
  cases: PlacedCase[],
  f: Foot,
  layer: number,
  deckHeight: number,
  excludeId?: string
): number {
  const bases = computeBaseYMap(cases, deckHeight);
  let base = deckHeight;
  for (const c of cases) {
    if (c.id === excludeId || c.z >= layer) continue;
    if (!footprintsIntersect(f, foot(c))) continue;
    base = Math.max(base, (bases.get(c.id) ?? deckHeight) + (c.height || 0));
  }
  return base;
}
