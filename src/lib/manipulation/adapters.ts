/**
 * Adapters that map each builder's domain model onto the SHARED
 * {@link ManipObject} model, so one manipulation engine drives both.
 */
import type { ManipObject } from "./types";
import type { PlacedCase } from "@/types/pallet-builder";
import type { PlacedPallet } from "@/types/trailer-builder";
import type { SavedPalletBuild } from "@/hooks/use-saved-pallet-builds";

/** Pallet Builder: a carton on the pallet deck. `baseY` is its real height. */
export function caseToManip(c: PlacedCase, baseY: number): ManipObject {
  return {
    id: c.id,
    x: c.x,
    y: c.y,
    z: baseY,
    width: c.width,
    length: c.length,
    height: c.height,
    weight: c.weight || 0,
    rotation: c.rotation ?? 0,
    rotationX: c.rotationX,
    rotationY: c.rotationY,
    rotationZ: c.rotationZ,
    kind: "case",
    fragile: c.fragile,
    stackable: true,
  };
}

/** Write a manipulated object back onto a carton (layer index recomputed). */
export function manipToCase(o: ManipObject, base: PlacedCase, layer: number): PlacedCase {
  return {
    ...base,
    x: Math.round(o.x),
    y: Math.round(o.y),
    z: layer,
    rotation: ((Math.round(o.rotation) % 360) + 360) % 360,
    rotationX: o.rotationX,
    rotationY: o.rotationY,
    rotationZ: o.rotationZ,
  };
}

export function palletTotalWeight(p: SavedPalletBuild): number {
  return p.pallet_data.placedCases.reduce((s, c) => s + (c.weight || 0), 0);
}

export function palletTotalHeight(p: SavedPalletBuild, deckHeight = 5): number {
  const cases = p.pallet_data.placedCases;
  if (cases.length === 0) return deckHeight + 12;
  const layerH = new Map<number, number>();
  for (const c of cases) layerH.set(c.z, Math.max(layerH.get(c.z) || 0, c.height || 0));
  let total = 0;
  for (const h of layerH.values()) total += h;
  return deckHeight + (total || 12);
}

/** Trailer Builder: a loaded pallet inside the vehicle. */
export function palletToManip(p: PlacedPallet, deckHeight = 5): ManipObject {
  const d = p.palletData.pallet_data.palletDimensions;
  return {
    id: p.id,
    x: p.x,
    y: p.y,
    z: (p as PlacedPallet & { z?: number }).z ?? 0,
    width: d.width,
    length: d.length,
    height: palletTotalHeight(p.palletData, deckHeight),
    weight: palletTotalWeight(p.palletData),
    rotation: p.rotation ?? 0,
    kind: "pallet",
    parentId: p.stackedOn ?? null,
    stackable: p.cargo?.stackable !== false,
    fragile: p.cargo?.fragile,
  };
}

/** Write a manipulated object back onto a placed pallet. */
export function manipToPalletUpdate(o: ManipObject): Partial<PlacedPallet> & { z?: number } {
  return {
    x: Math.round(o.x),
    y: Math.round(o.y),
    z: Math.round(o.z),
    rotation: ((Math.round(o.rotation) % 360) + 360) % 360,
    stackedOn: o.parentId ?? null,
  };
}
