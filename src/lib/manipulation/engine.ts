/**
 * Shared 3D Manipulation Engine — pure geometry + rules.
 *
 * No React, no three.js. Both builders call these functions so selection,
 * snapping, collision, stacking and validation behave identically.
 */

import type {
  Footprint,
  InvalidReason,
  ManipObject,
  ManipWorld,
  PlacementCheck,
  SnapResult,
} from "./types";

export const DEFAULT_SNAP = 3;
export const DEFAULT_MIN_SUPPORT = 0.7;
const EPS = 0.05;

/** Rotated axis-aligned footprint. */
export function footprintOf(o: Pick<ManipObject, "width" | "length" | "rotation">): Footprint {
  const rot = ((o.rotation % 360) + 360) % 360;
  const swap = rot === 90 || rot === 270;
  return { w: swap ? o.length : o.width, l: swap ? o.width : o.length };
}

export function overlaps2D(
  ax: number, ay: number, aw: number, al: number,
  bx: number, by: number, bw: number, bl: number,
  tol = EPS,
): boolean {
  return (
    Math.min(ax + aw, bx + bw) - Math.max(ax, bx) > tol &&
    Math.min(ay + al, by + bl) - Math.max(ay, by) > tol
  );
}

/** Vertical spans overlap (two objects share the same air). */
function overlapsZ(az: number, ah: number, bz: number, bh: number): boolean {
  return Math.min(az + ah, bz + bh) - Math.max(az, bz) > 0.25;
}

/** Real 3D collision test — checks footprint AND vertical span. */
export function collides(
  o: ManipObject,
  x: number,
  y: number,
  z: number,
  world: ManipWorld,
  ignoreIds: string[] = [],
): boolean {
  const { w, l } = footprintOf(o);
  for (const p of world.objects) {
    if (p.id === o.id || ignoreIds.includes(p.id)) continue;
    const pf = footprintOf(p);
    if (!overlaps2D(x, y, w, l, p.x, p.y, pf.w, pf.l)) continue;
    if (overlapsZ(z, o.height, p.z, p.height)) return true;
  }
  return false;
}

/** Ratio of the footprint supported from below (deck counts as full support). */
export function supportRatio(
  o: ManipObject,
  x: number,
  y: number,
  z: number,
  world: ManipWorld,
  ignoreIds: string[] = [],
): number {
  if (z <= 0.5) return 1;
  const { w, l } = footprintOf(o);
  const area = w * l;
  if (area <= 0) return 0;
  let covered = 0;
  for (const p of world.objects) {
    if (p.id === o.id || ignoreIds.includes(p.id)) continue;
    if (Math.abs(p.z + p.height - z) > 1) continue;
    const pf = footprintOf(p);
    const ox = Math.min(x + w, p.x + pf.w) - Math.max(x, p.x);
    const oy = Math.min(y + l, p.y + pf.l) - Math.max(y, p.y);
    if (ox > 0 && oy > 0) covered += ox * oy;
  }
  return Math.min(1, covered / area);
}

/** The object whose top surface a footprint is resting on, if any. */
export function supportParent(
  o: ManipObject,
  x: number,
  y: number,
  z: number,
  world: ManipWorld,
): string | null {
  if (z <= 0.5) return null;
  const { w, l } = footprintOf(o);
  let best: { id: string; area: number } | null = null;
  for (const p of world.objects) {
    if (p.id === o.id) continue;
    if (Math.abs(p.z + p.height - z) > 1) continue;
    const pf = footprintOf(p);
    const ox = Math.min(x + w, p.x + pf.w) - Math.max(x, p.x);
    const oy = Math.min(y + l, p.y + pf.l) - Math.max(y, p.y);
    const area = ox > 0 && oy > 0 ? ox * oy : 0;
    if (area > 0 && (!best || area > best.area)) best = { id: p.id, area };
  }
  return best?.id ?? null;
}

/** Clamp a footprint so it stays fully inside the world box. */
export function clampToBounds(x: number, y: number, w: number, l: number, world: ManipWorld) {
  return {
    x: Math.max(0, Math.min(x, Math.max(0, world.width - w))),
    y: Math.max(0, Math.min(y, Math.max(0, world.length - l))),
  };
}

/**
 * Gravity: the lowest resting height at (x, y) — the deck, or the top of
 * whatever is directly beneath, with enough support and no collision.
 */
export function restHeight(
  o: ManipObject,
  x: number,
  y: number,
  world: ManipWorld,
  preferZ = 0,
): number {
  const minSupport = world.minSupport ?? DEFAULT_MIN_SUPPORT;
  const { w, l } = footprintOf(o);
  const levels = new Set<number>([0]);
  if (world.allowStacking !== false && o.stackable !== false) {
    for (const p of world.objects) {
      if (p.id === o.id) continue;
      const pf = footprintOf(p);
      if (overlaps2D(x, y, w, l, p.x, p.y, pf.w, pf.l)) levels.add(p.z + p.height);
    }
  }
  const sorted = [...levels].sort((a, b) => a - b);
  for (const z of sorted) {
    if (z + 0.001 < preferZ) continue;
    if (collides(o, x, y, z, world)) continue;
    if (world.height != null && z + o.height > world.height + 0.001) continue;
    if (supportRatio(o, x, y, z, world) + 0.0001 < minSupport) continue;
    return z;
  }
  // Nothing valid at/above preferZ — fall back to the lowest collision-free level.
  for (const z of sorted) if (!collides(o, x, y, z, world)) return z;
  return sorted[sorted.length - 1] ?? 0;
}

/**
 * Smart snapping. Pulls a footprint to the floor, the walls, the corners and
 * the edges of neighbouring objects, then settles it with gravity so cases
 * land on pallets and pallets land on the trailer floor.
 */
export function snapPlacement(
  o: ManipObject,
  rawX: number,
  rawY: number,
  world: ManipWorld,
  opts: { preferZ?: number; snap?: number; enabled?: boolean } = {},
): SnapResult {
  const snap = opts.snap ?? world.snapDistance ?? DEFAULT_SNAP;
  const { w, l } = footprintOf(o);
  const clamped = clampToBounds(rawX, rawY, w, l, world);
  let x = clamped.x;
  let y = clamped.y;
  let source: SnapResult["source"] = "free";
  let label: string | undefined;

  if (opts.enabled !== false) {
    let snappedX = false;
    let snappedY = false;

    // Walls
    if (x < snap) { x = 0; snappedX = true; label = "Flush left wall"; }
    else if (world.width - (x + w) < snap) { x = world.width - w; snappedX = true; label = "Flush right wall"; }
    if (y < snap) { y = 0; snappedY = true; label = "Flush front"; }
    else if (world.length - (y + l) < snap) { y = world.length - l; snappedY = true; label = "Flush rear"; }
    if (snappedX || snappedY) source = snappedX && snappedY ? "corner" : "wall";

    // Neighbour edges (flush and aligned)
    for (const p of world.objects) {
      if (p.id === o.id) continue;
      const pf = footprintOf(p);
      if (!snappedX) {
        if (Math.abs(x - (p.x + pf.w)) < snap) { x = p.x + pf.w; snappedX = true; }
        else if (Math.abs(x + w - p.x) < snap) { x = p.x - w; snappedX = true; }
        else if (Math.abs(x - p.x) < snap) { x = p.x; snappedX = true; }
      }
      if (!snappedY) {
        if (Math.abs(y - (p.y + pf.l)) < snap) { y = p.y + pf.l; snappedY = true; }
        else if (Math.abs(y + l - p.y) < snap) { y = p.y - l; snappedY = true; }
        else if (Math.abs(y - p.y) < snap) { y = p.y; snappedY = true; }
      }
      if (snappedX && snappedY) break;
    }
    if (source === "free" && (snappedX || snappedY)) {
      source = "edge";
      label = "Flush with neighbour";
    }
    const re = clampToBounds(x, y, w, l, world);
    x = re.x;
    y = re.y;
  }

  const z = restHeight(o, x, y, world, opts.preferZ ?? 0);
  const parentId = supportParent(o, x, y, z, world);
  if (z > 0.5 && parentId) {
    source = "stack";
    label = "Stacked on item";
  } else if (source === "free") {
    source = "floor";
    label = "On the deck";
  }
  return { x, y, z, source, parentId, label };
}

/** Full validation of a hypothetical placement. */
export function validatePlacement(
  o: ManipObject,
  x: number,
  y: number,
  z: number,
  world: ManipWorld,
): PlacementCheck {
  const reasons: InvalidReason[] = [];
  const { w, l } = footprintOf(o);
  const minSupport = world.minSupport ?? DEFAULT_MIN_SUPPORT;

  if (x < -EPS || y < -EPS || x + w > world.width + EPS || y + l > world.length + EPS) {
    reasons.push("out_of_bounds");
  }
  if (collides(o, x, y, z, world)) reasons.push("collision");
  if (supportRatio(o, x, y, z, world) + 0.0001 < minSupport) reasons.push("no_support");
  if (world.height != null && z + o.height > world.height + EPS) reasons.push("over_height");
  if (z > 0.5 && o.stackable === false) reasons.push("not_stackable");
  if (world.maxWeight != null) {
    const total = world.objects.reduce((s, p) => (p.id === o.id ? s : s + p.weight), 0);
    if (total + o.weight > world.maxWeight) reasons.push("over_capacity");
  }
  // Crushing a fragile item directly beneath.
  const parent = supportParent(o, x, y, z, world);
  if (parent) {
    const under = world.objects.find((p) => p.id === parent);
    if (under?.fragile && o.weight > under.weight) reasons.push("crushes_fragile");
  }

  return { valid: reasons.length === 0, reasons, message: reasons.length ? messageFor(reasons[0]) : undefined };
}

export function messageFor(reason: InvalidReason): string {
  switch (reason) {
    case "out_of_bounds": return "Outside the usable area";
    case "collision": return "Overlaps another object";
    case "no_support": return "Not enough support underneath";
    case "over_height": return "Exceeds the height limit";
    case "over_capacity": return "Exceeds weight capacity";
    case "not_stackable": return "This object cannot be stacked";
    case "crushes_fragile": return "Would crush a fragile item below";
  }
}

/** Re-settle every object bottom-up so nothing is ever left floating. */
export function settleAll(world: ManipWorld): ManipObject[] {
  const sorted = [...world.objects].sort((a, b) => a.z - b.z);
  const out: ManipObject[] = [];
  for (const o of sorted) {
    const scratch: ManipWorld = { ...world, objects: out };
    const z = restHeight(o, o.x, o.y, scratch, 0);
    out.push({ ...o, z, parentId: supportParent(o, o.x, o.y, z, scratch) });
  }
  return out;
}

/** Bounding box (three.js axes) used by camera focus. */
export function focusBox(o: ManipObject, world: ManipWorld) {
  const { w, l } = footprintOf(o);
  return {
    center: {
      x: -world.width / 2 + o.x + w / 2,
      y: o.z + o.height / 2,
      z: -world.length / 2 + o.y + l / 2,
    },
    radius: Math.max(w, l, o.height) * 0.5,
  };
}

/** World-space centre of a footprint (three.js axes). */
export function worldCenter(o: ManipObject, world: ManipWorld) {
  return focusBox(o, world).center;
}

/** Convert a three.js world point back to deck coordinates for a footprint. */
export function pointToDeck(
  pointX: number,
  pointZ: number,
  fp: Footprint,
  world: ManipWorld,
  centered = true,
) {
  return {
    x: pointX + world.width / 2 - (centered ? fp.w / 2 : 0),
    y: pointZ + world.length / 2 - (centered ? fp.l / 2 : 0),
  };
}
