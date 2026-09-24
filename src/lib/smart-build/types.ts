/**
 * Smart Build Engine — shared types for Pallet & Trailer 3D placement.
 *
 * All coordinates are in inches. The engine is agnostic to the object kind:
 * it only cares about footprints, heights, weights, and rules.
 */

export type BuildMode = "smart" | "precision" | "advanced";

export type FeedbackLevel = "green" | "yellow" | "red";

export interface SmartObject {
  id: string;
  /** Footprint width (X) at rotation=0, inches. */
  width: number;
  /** Footprint length (Z) at rotation=0, inches. */
  length: number;
  height: number;
  weight: number;
  /** Yaw in degrees (0/90/180/270 in smart mode). */
  rotation: number;
  /** Free-rotation Euler degrees (advanced). */
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  fragile?: boolean;
  /** Kind hint used by rule sets. */
  kind?: "carton" | "pallet" | "freight";
}

export interface PlacedObject extends SmartObject {
  /** Deck X of the footprint origin. */
  x: number;
  /** Deck Y (a.k.a. Z on the ground plane) of the footprint origin. */
  y: number;
  /** Vertical layer / stack height in inches. */
  z: number;
}

export interface World {
  /** Usable deck / floor width (X). */
  width: number;
  /** Usable deck / floor length (Y). */
  length: number;
  /** Optional vertical cap (trailer ceiling, max stack). */
  height?: number;
  /** Already-placed objects. */
  placed: PlacedObject[];
  /** Max weight capacity in same units as objects. */
  maxWeight?: number;
}

export interface Cursor {
  /** Deck X the cursor currently resolves to. */
  x: number;
  /** Deck Y the cursor currently resolves to. */
  y: number;
  /** Movement direction (unit vector) or null when idle. */
  dir?: { x: number; y: number } | null;
  /** Cursor speed (deck units/sec) — used by intent scoring. */
  speed?: number;
}

export interface PlacementCandidate {
  x: number;
  y: number;
  z: number;
  rotation: number;
  /** Human-readable label for the reason chip. */
  reason: string;
  /** Which snap source produced this candidate. */
  source:
    | "cursor"
    | "wall"
    | "corner"
    | "neighbor"
    | "stack"
    | "gap"
    | "row"
    | "center"
    | "gravity";
  score: number;
}

export interface Reason {
  code:
    | "no_support"
    | "overhang"
    | "hits_wall"
    | "exceeds_edge"
    | "blocks_unloading"
    | "weight_imbalance"
    | "axle_limit"
    | "stacking_restriction"
    | "collision"
    | "over_capacity"
    | "over_height";
  message: string;
}

export interface Validation {
  ok: boolean;
  level: FeedbackLevel;
  reasons: Reason[];
}

export interface RuleSet {
  /** Kind label used in messages. */
  kind: "pallet" | "trailer";
  /** Allow overhang beyond deck? Pallets no, trailers no (walls). */
  allowOverhang: boolean;
  /** Minimum support ratio (0-1) required under a stacked object. */
  minSupport: number;
  /** Max stack layers, if any. */
  maxLayers?: number;
  /** Vertical ceiling in inches. */
  maxHeight?: number;
  /** Whether objects can rest only on the floor (trailer pallets). */
  floorOnly?: boolean;
  /** Optional additional validators. */
  extraValidate?: (obj: PlacedObject, world: World) => Reason[];
}

export interface PlacementResult {
  best: PlacementCandidate | null;
  alternates: PlacementCandidate[];
  validation: Validation;
  /** If a different rotation would score meaningfully better. */
  rotationSuggestion?: { rotation: number; gain: number; label: string };
}
