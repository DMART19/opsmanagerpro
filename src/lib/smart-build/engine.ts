/**
 * Smart Build Engine — shared placement logic used by both the Pallet
 * Builder and Trailer Builder. Pure functions, no React, no three.js.
 *
 * Coordinate model: XY on the deck/floor plane, Z is stack height in inches.
 */

import {
  Cursor,
  PlacedObject,
  PlacementCandidate,
  PlacementResult,
  Reason,
  RuleSet,
  SmartObject,
  Validation,
  World,
} from "./types";
import { intentAlignment } from "./intent";

/** Score component weights (must sum to ~1.0). */
const W_CURSOR = 0.35;
const W_DIR = 0.2;
const W_ALIGN = 0.2;
const W_SUPPORT = 0.15;
const W_GRAVITY = 0.1;

/** Distance for magnetic snap (inches). */
export const SNAP_DIST = 3;

/** Rotated footprint at a given yaw (0/90/180/270). */
export function footprint(obj: SmartObject, rotation: number = obj.rotation) {
  const rot = ((rotation % 360) + 360) % 360;
  const rotated = rot === 90 || rot === 270;
  return {
    w: rotated ? obj.length : obj.width,
    l: rotated ? obj.width : obj.length,
  };
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  al: number,
  bx: number,
  by: number,
  bw: number,
  bl: number,
): boolean {
  return !(ax + aw <= bx || ax >= bx + bw || ay + al <= by || ay >= by + bl);
}

/** Objects sharing a stack layer at height z (approximate — same integer z). */
function itemsAtLayer(world: World, z: number): PlacedObject[] {
  return world.placed.filter((p) => Math.abs(p.z - z) < 0.5);
}

/** Objects whose top surface matches height z (potential support). */
function itemsWithTopAt(world: World, z: number): PlacedObject[] {
  return world.placed.filter((p) => Math.abs(p.z + p.height - z) < 1);
}

/** Collision at (x, y, z, rot). Ignores object with id === ignoreId. */
export function collides(
  obj: SmartObject,
  x: number,
  y: number,
  z: number,
  rotation: number,
  world: World,
  ignoreId?: string,
): boolean {
  const { w, l } = footprint(obj, rotation);
  for (const p of itemsAtLayer(world, z)) {
    if (ignoreId && p.id === ignoreId) continue;
    const { w: pw, l: pl } = footprint(p);
    if (rectsOverlap(x, y, w, l, p.x, p.y, pw, pl)) return true;
  }
  return false;
}

/** Percentage of an object's footprint supported by objects below or the deck. */
export function supportRatio(
  obj: SmartObject,
  x: number,
  y: number,
  z: number,
  rotation: number,
  world: World,
): number {
  if (z <= 0.5) return 1; // resting on deck
  const { w, l } = footprint(obj, rotation);
  const area = w * l;
  if (area <= 0) return 0;
  let covered = 0;
  for (const p of itemsWithTopAt(world, z)) {
    const { w: pw, l: pl } = footprint(p);
    const ox = Math.max(x, p.x);
    const oy = Math.max(y, p.y);
    const ex = Math.min(x + w, p.x + pw);
    const ey = Math.min(y + l, p.y + pl);
    if (ex > ox && ey > oy) covered += (ex - ox) * (ey - oy);
  }
  return Math.min(1, covered / area);
}

/**
 * Settle: return the lowest z where the object rests with adequate support
 * and no collision. Starts from `preferZ` and walks down to the deck.
 */
export function settleGravity(
  obj: SmartObject,
  x: number,
  y: number,
  rotation: number,
  world: World,
  rules: RuleSet,
  preferZ = 0,
): number {
  const { w, l } = footprint(obj, rotation);
  // Candidate rest heights: 0 (deck) + tops of any items whose footprint overlaps.
  const candidates = new Set<number>([0]);
  for (const p of world.placed) {
    const { w: pw, l: pl } = footprint(p);
    if (rectsOverlap(x, y, w, l, p.x, p.y, pw, pl)) {
      candidates.add(p.z + p.height);
    }
  }
  // Pick smallest candidate >= preferZ that is collision-free with enough support.
  const sorted = [...candidates].sort((a, b) => a - b);
  for (const z of sorted) {
    if (z + 0.001 < preferZ) continue;
    if (collides(obj, x, y, z, rotation, world)) continue;
    if (rules.floorOnly && z > 0.5) continue;
    if (rules.maxHeight && z + obj.height > rules.maxHeight) continue;
    const s = supportRatio(obj, x, y, z, rotation, world);
    if (s + 0.0001 >= rules.minSupport) return z;
  }
  // Fallback: highest candidate (may still be invalid — validation will flag it).
  return sorted[sorted.length - 1] ?? 0;
}

/** Clamp footprint origin to world bounds. */
function clamp(x: number, y: number, w: number, l: number, world: World) {
  return {
    x: Math.max(0, Math.min(x, world.width - w)),
    y: Math.max(0, Math.min(y, world.length - l)),
  };
}

/** Magnetic snap: pull position toward nearby edges/neighbors/corners. */
export function snapMagnetic(
  x: number,
  y: number,
  w: number,
  l: number,
  world: World,
  ignoreId?: string,
  snap: number = SNAP_DIST,
): { x: number; y: number; snapped: boolean; reason?: string } {
  let nx = x;
  let ny = y;
  let reason: string | undefined;
  let snapped = false;

  // Walls
  if (x < snap) {
    nx = 0;
    snapped = true;
    reason = "Snapped to left wall";
  } else if (world.width - (x + w) < snap) {
    nx = world.width - w;
    snapped = true;
    reason = "Snapped to right wall";
  }
  if (y < snap) {
    ny = 0;
    snapped = true;
    reason = reason ? "Snapped to corner" : "Snapped to front wall";
  } else if (world.length - (y + l) < snap) {
    ny = world.length - l;
    snapped = true;
    reason = reason ? "Snapped to corner" : "Snapped to rear wall";
  }

  // Neighbors (align to their edges)
  for (const p of world.placed) {
    if (ignoreId && p.id === ignoreId) continue;
    const { w: pw, l: pl } = footprint(p);
    if (Math.abs(nx - (p.x + pw)) < snap) {
      nx = p.x + pw;
      snapped = true;
      reason = "Flush with neighbor";
    } else if (Math.abs(nx + w - p.x) < snap) {
      nx = p.x - w;
      snapped = true;
      reason = "Flush with neighbor";
    }
    if (Math.abs(ny - (p.y + pl)) < snap) {
      ny = p.y + pl;
      snapped = true;
      reason = "Flush with neighbor";
    } else if (Math.abs(ny + l - p.y) < snap) {
      ny = p.y - l;
      snapped = true;
      reason = "Flush with neighbor";
    }
  }

  const cl = clamp(nx, ny, w, l, world);
  return { x: cl.x, y: cl.y, snapped, reason };
}

/** Validate a hypothetical placement against the world + rules. */
export function validate(
  obj: SmartObject,
  x: number,
  y: number,
  z: number,
  rotation: number,
  world: World,
  rules: RuleSet,
  ignoreId?: string,
): Validation {
  const reasons: Reason[] = [];
  const { w, l } = footprint(obj, rotation);

  if (!rules.allowOverhang) {
    if (x < -0.001 || y < -0.001 || x + w > world.width + 0.001 || y + l > world.length + 0.001) {
      reasons.push({
        code: rules.kind === "trailer" ? "hits_wall" : "exceeds_edge",
        message:
          rules.kind === "trailer"
            ? "Hits trailer wall — reduce footprint or rotate."
            : "Exceeds pallet edge — pull inward.",
      });
    }
  }

  if (collides(obj, x, y, z, rotation, world, ignoreId)) {
    reasons.push({ code: "collision", message: "Overlaps another item at this layer." });
  }

  const s = supportRatio(obj, x, y, z, rotation, world);
  if (s < rules.minSupport) {
    reasons.push({
      code: "no_support",
      message: `Not enough support (${Math.round(s * 100)}% under item; needs ${Math.round(
        rules.minSupport * 100,
      )}%).`,
    });
  }

  if (rules.maxHeight && z + obj.height > rules.maxHeight + 0.001) {
    reasons.push({ code: "over_height", message: "Exceeds vertical ceiling." });
  }

  if (world.maxWeight != null) {
    const total = world.placed.reduce((sum, p) => (p.id === ignoreId ? sum : sum + p.weight), 0);
    if (total + obj.weight > world.maxWeight) {
      reasons.push({ code: "over_capacity", message: "Exceeds weight capacity." });
    }
  }

  if (rules.extraValidate) {
    reasons.push(
      ...rules.extraValidate({ ...obj, x, y, z, rotation } as PlacedObject, world),
    );
  }

  const hardCodes = new Set([
    "collision",
    "hits_wall",
    "exceeds_edge",
    "over_height",
    "over_capacity",
    "axle_limit",
  ]);
  const hard = reasons.some((r) => hardCodes.has(r.code));
  const level = hard ? "red" : reasons.length ? "yellow" : "green";
  return { ok: level === "green", level, reasons };
}

/** Score a candidate 0..1. Higher = more preferred. */
function scoreCandidate(
  cand: PlacementCandidate,
  obj: SmartObject,
  cursor: Cursor,
  world: World,
  rules: RuleSet,
): number {
  const { w, l } = footprint(obj, cand.rotation);
  const cx = cand.x + w / 2;
  const cy = cand.y + l / 2;
  const dx = cx - cursor.x;
  const dy = cy - cursor.y;
  const d = Math.hypot(dx, dy);
  const worldDiag = Math.hypot(world.width, world.length);
  const cursorScore = 1 - Math.min(1, d / (worldDiag / 2));
  const dirScore = intentAlignment(cursor, cx, cy);
  // Alignment bonus if snapped to something meaningful
  const alignScore = cand.source === "cursor" ? 0.3 : 1;
  const support = supportRatio(obj, cand.x, cand.y, cand.z, cand.rotation, world);
  const supportScore = Math.min(1, support / Math.max(0.01, rules.minSupport));
  // Gravity: lower z is preferred proportionally to object weight
  const gravScore = 1 - Math.min(1, cand.z / Math.max(1, rules.maxHeight ?? 100));
  return (
    W_CURSOR * cursorScore +
    W_DIR * dirScore +
    W_ALIGN * alignScore +
    W_SUPPORT * supportScore +
    W_GRAVITY * gravScore
  );
}

/** Generate placement candidates around the cursor. */
function generateCandidates(
  obj: SmartObject,
  cursor: Cursor,
  world: World,
  rules: RuleSet,
  rotations: number[],
  ignoreId?: string,
): PlacementCandidate[] {
  const out: PlacementCandidate[] = [];

  for (const rot of rotations) {
    const { w, l } = footprint(obj, rot);
    if (w > world.width || l > world.length) continue;

    // 1) Cursor-anchored (footprint centered on cursor)
    const cx = cursor.x - w / 2;
    const cy = cursor.y - l / 2;
    const c = clamp(cx, cy, w, l, world);
    const cz = settleGravity(obj, c.x, c.y, rot, world, rules);
    out.push({ x: c.x, y: c.y, z: cz, rotation: rot, reason: "At cursor", source: "cursor", score: 0 });

    // 2) Magnetic snap from cursor
    const snap = snapMagnetic(c.x, c.y, w, l, world, ignoreId);
    if (snap.snapped) {
      const sz = settleGravity(obj, snap.x, snap.y, rot, world, rules);
      out.push({
        x: snap.x,
        y: snap.y,
        z: sz,
        rotation: rot,
        reason: snap.reason ?? "Snapped",
        source: snap.reason?.includes("wall") ? "wall" : "neighbor",
        score: 0,
      });
    }

    // 3) Stack on top of item under cursor
    for (const p of world.placed) {
      if (ignoreId && p.id === ignoreId) continue;
      const { w: pw, l: pl } = footprint(p);
      if (
        cursor.x >= p.x &&
        cursor.x <= p.x + pw &&
        cursor.y >= p.y &&
        cursor.y <= p.y + pl
      ) {
        const sx = clamp(p.x + pw / 2 - w / 2, p.y + pl / 2 - l / 2, w, l, world);
        out.push({
          x: sx.x,
          y: sx.y,
          z: p.z + p.height,
          rotation: rot,
          reason: "Stacked on item",
          source: "stack",
          score: 0,
        });
      }
    }

    // 4) Deck center fallback (helps first-place UX)
    if (world.placed.length === 0) {
      out.push({
        x: (world.width - w) / 2,
        y: (world.length - l) / 2,
        z: 0,
        rotation: rot,
        reason: "Centered on deck",
        source: "center",
        score: 0,
      });
    }
  }

  return out;
}

/**
 * Main entrypoint. Returns the best placement, alternates, and validation.
 * `mode` gates rotation candidates: smart tries 0/90, precision uses obj.rotation only.
 */
export function resolvePlacement(
  obj: SmartObject,
  cursor: Cursor,
  world: World,
  rules: RuleSet,
  opts: { mode?: "smart" | "precision" | "advanced"; ignoreId?: string } = {},
): PlacementResult {
  const mode = opts.mode ?? "smart";
  const rotations =
    mode === "smart"
      ? [obj.rotation, (obj.rotation + 90) % 360]
      : mode === "precision"
        ? [obj.rotation]
        : [obj.rotation, (obj.rotation + 90) % 360, (obj.rotation + 180) % 360, (obj.rotation + 270) % 360];

  const cands = generateCandidates(obj, cursor, world, rules, rotations, opts.ignoreId);
  for (const c of cands) c.score = scoreCandidate(c, obj, cursor, world, rules);

  // Prefer valid over invalid; then higher score.
  cands.sort((a, b) => {
    const av = validate(obj, a.x, a.y, a.z, a.rotation, world, rules, opts.ignoreId).level;
    const bv = validate(obj, b.x, b.y, b.z, b.rotation, world, rules, opts.ignoreId).level;
    const rank: Record<string, number> = { green: 0, yellow: 1, red: 2 };
    if (rank[av] !== rank[bv]) return rank[av] - rank[bv];
    return b.score - a.score;
  });

  const best = cands[0] ?? null;
  const alternates = cands.slice(1, 4);
  const validation = best
    ? validate(obj, best.x, best.y, best.z, best.rotation, world, rules, opts.ignoreId)
    : { ok: false, level: "red" as const, reasons: [{ code: "collision" as const, message: "No valid placement found." }] };

  // Rotation suggestion — did a non-default yaw score materially better?
  let rotationSuggestion: PlacementResult["rotationSuggestion"];
  if (best && best.rotation !== obj.rotation) {
    const sameRot = cands.find((c) => c.rotation === obj.rotation);
    const gain = sameRot ? best.score - sameRot.score : 1;
    if (gain > 0.05) {
      const delta = ((best.rotation - obj.rotation + 360) % 360);
      rotationSuggestion = {
        rotation: best.rotation,
        gain,
        label: `Fits better if rotated ${delta}°`,
      };
    }
  }

  return { best, alternates, validation, rotationSuggestion };
}
