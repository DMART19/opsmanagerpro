import * as THREE from "three";
import type { PlacedCase } from "@/types/pallet-builder";

/**
 * Free-rotation helpers.
 *
 * The pallet builder stores rotation as degrees on up to three axes:
 *   - `rotationX` (pitch), `rotationY` (yaw), `rotationZ` (roll)
 * with a legacy `rotation` field that is treated as yaw (Y axis) when
 * `rotationY` is not explicitly set. Angles are in DEGREES throughout the
 * data model; converted to radians only for THREE.js.
 */

export interface EulerDeg {
  x: number;
  y: number;
  z: number;
}

export const getEulerDeg = (c: PlacedCase): EulerDeg => ({
  x: c.rotationX ?? 0,
  y: c.rotationY ?? c.rotation ?? 0,
  z: c.rotationZ ?? 0,
});

export const toRadians = (deg: number) => (deg * Math.PI) / 180;
export const toDegrees = (rad: number) => (rad * 180) / Math.PI;

export const eulerRad = (c: PlacedCase): [number, number, number] => {
  const e = getEulerDeg(c);
  return [toRadians(e.x), toRadians(e.y), toRadians(e.z)];
};

export const hasFreeRotation = (c: PlacedCase): boolean => {
  const e = getEulerDeg(c);
  // Anything that isn't an axis-aligned 90° yaw is "free"
  const yawIsAxisAligned = e.y % 90 === 0;
  return e.x !== 0 || e.z !== 0 || !yawIsAxisAligned;
};

/**
 * Rotated axis-aligned bounding box, expressed relative to the case center
 * BEFORE positional translation. Returned dimensions are in the same units
 * as the case (inches). `dy` is the vertical extent above/below the center.
 */
export interface RotatedAABB {
  /** Axis-aligned footprint width along X. */
  w: number;
  /** Axis-aligned footprint length along Z. */
  l: number;
  /** Half-height above the center (i.e. top offset from center). */
  halfH: number;
  /** Minimum Y offset from center (typically negative). */
  minDy: number;
  /** Maximum Y offset from center. */
  maxDy: number;
}

/**
 * Compute the tight AABB of a rotated carton around its own center.
 * Uses the classic 8-corner projection which is exact for any Euler rotation.
 */
export const getRotatedAABB = (c: PlacedCase): RotatedAABB => {
  const hx = c.width / 2;
  const hy = c.height / 2;
  const hz = c.length / 2;

  // Fast path: no free rotation → legacy 90°-step swap of width/length.
  if (!hasFreeRotation(c)) {
    const rot = ((c.rotationY ?? c.rotation ?? 0) % 360 + 360) % 360;
    const rotated = rot === 90 || rot === 270;
    return {
      w: rotated ? c.length : c.width,
      l: rotated ? c.width : c.length,
      halfH: c.height / 2,
      minDy: -c.height / 2,
      maxDy: c.height / 2,
    };
  }

  const e = new THREE.Euler(...eulerRad(c), "XYZ");
  const q = new THREE.Quaternion().setFromEuler(e);
  const corners: THREE.Vector3[] = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        corners.push(new THREE.Vector3(sx * hx, sy * hy, sz * hz).applyQuaternion(q));
      }
    }
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const v of corners) {
    if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
    if (v.z < minZ) minZ = v.z; if (v.z > maxZ) maxZ = v.z;
  }
  return {
    w: maxX - minX,
    l: maxZ - minZ,
    halfH: Math.max(Math.abs(minY), Math.abs(maxY)),
    minDy: minY,
    maxDy: maxY,
  };
};

/**
 * Return the axis-aligned footprint of a case as (originX, originZ, width, length)
 * where origin is the top-left in pallet coordinates. Used by collision + bounds.
 */
export const getFootprint = (c: PlacedCase) => {
  const aabb = getRotatedAABB(c);
  const cx = c.x + (hasFreeRotation(c)
    ? // For free-rotated cases we treat (c.x, c.y) as the case CENTER on the deck.
      0
    : (c.rotationY ?? c.rotation ?? 0) % 180 === 0 ? c.width / 2 : c.length / 2);
  const cz = c.y + (hasFreeRotation(c)
    ? 0
    : (c.rotationY ?? c.rotation ?? 0) % 180 === 0 ? c.length / 2 : c.width / 2);
  return {
    x: cx - aabb.w / 2,
    y: cz - aabb.l / 2,
    w: aabb.w,
    l: aabb.l,
  };
};
