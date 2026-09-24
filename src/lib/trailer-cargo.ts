/**
 * Cargo model + geometry helpers shared by the Trailer Load Builder.
 * Additive: every field is optional so existing pallet loads keep working.
 */
import { PlacedPallet } from "@/types/trailer-builder";

export type CargoKind =
  | "pallet" | "box" | "crate" | "machinery" | "pipe_bundle" | "lumber"
  | "steel" | "appliance" | "motorcycle" | "atv" | "furniture" | "custom";

export const CARGO_KINDS: { value: CargoKind; label: string }[] = [
  { value: "pallet", label: "Pallet" },
  { value: "box", label: "Box" },
  { value: "crate", label: "Crate" },
  { value: "machinery", label: "Machinery" },
  { value: "pipe_bundle", label: "Pipe Bundle" },
  { value: "lumber", label: "Lumber" },
  { value: "steel", label: "Steel" },
  { value: "appliance", label: "Appliance" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "atv", label: "ATV" },
  { value: "furniture", label: "Furniture" },
  { value: "custom", label: "Custom Item" },
];

export interface CargoProperties {
  kind: CargoKind;
  stackable: boolean;
  maxStackHeight: number;
  /** Max weight allowed above this item, lbs. 0 = unlimited. */
  maxWeightAbove: number;
  fragile: boolean;
  hazmat: boolean;
  keepUpright: boolean;
  tempControlled: boolean;
  cannotRotate: boolean;
  requiresBlocking: boolean;
  requiresStraps: boolean;
  color?: string;
  notes?: string;
}

export const DEFAULT_CARGO: CargoProperties = {
  kind: "pallet",
  stackable: false,
  maxStackHeight: 2,
  maxWeightAbove: 0,
  fragile: false,
  hazmat: false,
  keepUpright: false,
  tempControlled: false,
  cannotRotate: false,
  requiresBlocking: false,
  requiresStraps: false,
};

export const cargoOf = (p: PlacedPallet): CargoProperties => ({
  ...DEFAULT_CARGO,
  ...((p.cargo || {}) as Partial<CargoProperties>),
});

/** Footprint in inches, rotation aware. */
export const footprintOf = (p: PlacedPallet) => {
  const d = p.palletData?.pallet_data?.palletDimensions ?? { width: 48, length: 40 };
  const rotated = p.rotation === 90 || p.rotation === 270;
  return { w: rotated ? d.length : d.width, l: rotated ? d.width : d.length };
};

/** Physical stack height of a single unit, inches. */
export const heightOf = (p: PlacedPallet): number => {
  const cases = p.palletData?.pallet_data?.placedCases ?? [];
  const top = cases.reduce(
    (max: number, c: any) => Math.max(max, (c.z || 0) + (c.height || 0)),
    0
  );
  return Math.max(6, top + 5); // + pallet deck
};

export const weightOf = (p: PlacedPallet): number => {
  const cases = p.palletData?.pallet_data?.placedCases ?? [];
  return cases.reduce((s: number, c: any) => s + (c.weight || 0), 0);
};

/** Total height of an item including anything it sits on. */
export const topHeightOf = (p: PlacedPallet, all: PlacedPallet[]): number => {
  const base = p.stackedOn ? topHeightOf(all.find(a => a.id === p.stackedOn) ?? p, all) : 0;
  return (p.stackedOn ? base : 0) + heightOf(p);
};

export const stackChildren = (p: PlacedPallet, all: PlacedPallet[]) =>
  all.filter(a => a.stackedOn === p.id);

export const stackLevelOf = (p: PlacedPallet, all: PlacedPallet[]): number =>
  p.stackedOn ? stackLevelOf(all.find(a => a.id === p.stackedOn) ?? p, all) + 1 : 1;

/** Weight resting on top of an item (its whole sub-stack). */
export const weightAboveOf = (p: PlacedPallet, all: PlacedPallet[]): number =>
  stackChildren(p, all).reduce(
    (s, c) => s + weightOf(c) + weightAboveOf(c, all),
    0
  );

/** Can `moving` legally be stacked on `base`? */
export function canStack(
  moving: PlacedPallet,
  base: PlacedPallet,
  all: PlacedPallet[],
  trailerHeight?: number
): { ok: boolean; reason?: string } {
  const b = cargoOf(base);
  const m = cargoOf(moving);
  if (!b.stackable) return { ok: false, reason: "Base cargo is not stackable" };
  if (b.fragile) return { ok: false, reason: "Cannot place weight on fragile cargo" };
  void m;
  const level = stackLevelOf(base, all) + 1;
  if (level > Math.max(1, b.maxStackHeight)) return { ok: false, reason: "Exceeds max stack height" };
  const above = weightAboveOf(base, all) + weightOf(moving);
  if (b.maxWeightAbove > 0 && above > b.maxWeightAbove)
    return { ok: false, reason: "Exceeds max weight above base cargo" };
  if (trailerHeight) {
    const h = topHeightOf(base, all) + heightOf(moving);
    if (h > trailerHeight) return { ok: false, reason: "Exceeds trailer height" };
  }
  return { ok: true };
}

export const formatFeetInches = (inches: number) => {
  const ft = Math.floor(inches / 12);
  const inch = Math.round(inches % 12);
  return `${ft}'${inch}"`;
};
