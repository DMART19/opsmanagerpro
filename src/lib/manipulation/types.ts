/**
 * Shared 3D Manipulation Engine — types.
 *
 * ONE engine, used by both the Pallet Builder (cases on a pallet) and the
 * Trailer Builder (pallets inside a vehicle). Everything is expressed in
 * inches in a right-handed "world box" whose origin is the min corner:
 *
 *   x → across the deck/floor   (three.js X)
 *   y → along the deck/floor    (three.js Z)
 *   z → vertical stack height   (three.js Y)
 */

export type TransformMode = "move" | "rotate" | "vertical";

/** Anything the user can select, move, rotate, stack or delete. */
export interface ManipObject {
  id: string;
  /** Footprint origin (min corner) across the deck. */
  x: number;
  /** Footprint origin (min corner) along the deck. */
  y: number;
  /** Base height of the object (0 = resting on the deck/floor). */
  z: number;
  /** Footprint width at rotation 0. */
  width: number;
  /** Footprint length at rotation 0. */
  length: number;
  height: number;
  weight: number;
  /** Yaw in degrees. */
  rotation: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  /** What this object is — drives stacking rules. */
  kind: "case" | "pallet" | "freight";
  /** id of the object this one rests on, when stacked. */
  parentId?: string | null;
  /** Objects that must stay on the floor (e.g. non-stackable freight). */
  stackable?: boolean;
  fragile?: boolean;
  locked?: boolean;
}

export interface ManipWorld {
  /** Usable deck/floor width (x). */
  width: number;
  /** Usable deck/floor length (y). */
  length: number;
  /** Vertical ceiling, if any. */
  height?: number;
  /** Height of the deck surface objects rest on (pallet deck thickness). */
  deckHeight?: number;
  objects: ManipObject[];
  maxWeight?: number;
  /** Allow objects to be stacked on top of other objects. */
  allowStacking?: boolean;
  /** Minimum footprint support ratio required under a stacked object (0-1). */
  minSupport?: number;
  /** Magnetic snap radius in inches. */
  snapDistance?: number;
}

export interface Footprint {
  w: number;
  l: number;
}

export type InvalidReason =
  | "out_of_bounds"
  | "collision"
  | "no_support"
  | "over_height"
  | "over_capacity"
  | "not_stackable"
  | "crushes_fragile";

export interface PlacementCheck {
  valid: boolean;
  reasons: InvalidReason[];
  message?: string;
}

export interface SnapResult {
  x: number;
  y: number;
  z: number;
  /** Which snap target produced the result — used for the on-screen hint. */
  source: "free" | "floor" | "wall" | "corner" | "edge" | "stack";
  /** id of the object we snapped on top of, if any. */
  parentId?: string | null;
  label?: string;
}
