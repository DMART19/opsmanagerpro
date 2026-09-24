/**
 * Auto Arrange — re-positions all existing cargo inside the vehicle.
 * Shelf packing (rows across the width) with:
 *  - largest-first placement to minimise gaps
 *  - heavy items pulled toward the trailer centre
 *  - orientation restrictions (cannotRotate / keepUpright)
 *  - optional delivery-stop ordering (later stops loaded first, i.e. nose-first)
 */
import { CustomTrailer } from "@/hooks/use-custom-trailers";
import { PlacedPallet } from "@/types/trailer-builder";
import { cargoOf, weightOf } from "@/lib/trailer-cargo";

export interface AutoArrangeOptions {
  /** Order by delivery stop (later stops toward the nose). */
  respectStops?: boolean;
  /** Bias heavy cargo toward the middle of the deck. */
  centerHeavy?: boolean;
  /** Gap between items, inches. */
  spacing?: number;
}

export interface AutoArrangeResult {
  placed: PlacedPallet[];
  skipped: PlacedPallet[];
}

const dims = (p: PlacedPallet) => {
  const d = p.palletData?.pallet_data?.palletDimensions ?? { width: 48, length: 40 };
  return { width: d.width, length: d.length };
};

export function autoArrange(
  trailer: CustomTrailer,
  pallets: PlacedPallet[],
  opts: AutoArrangeOptions = {}
): AutoArrangeResult {
  const { respectStops = false, centerHeavy = true, spacing = 0 } = opts;
  const TW = trailer.width;
  const TL = trailer.length;

  const items = [...pallets];
  items.sort((a, b) => {
    if (respectStops) {
      const sa = a.stopNumber ?? 99;
      const sb = b.stopNumber ?? 99;
      if (sa !== sb) return sb - sa; // later stops first (loaded deepest)
    }
    const ha = centerHeavy ? weightOf(b) - weightOf(a) : 0;
    if (ha) return ha;
    const areaA = dims(a).width * dims(a).length;
    const areaB = dims(b).width * dims(b).length;
    return areaB - areaA;
  });

  const placed: PlacedPallet[] = [];
  const skipped: PlacedPallet[] = [];

  let rowY = 0;
  let rowHeight = 0;
  let cursorX = 0;

  for (const item of items) {
    const c = cargoOf(item);
    const canRotate = !c.cannotRotate && !c.keepUpright;
    const d = dims(item);

    // Choose the orientation that fits the row best.
    const options: { rotation: number; w: number; l: number }[] = [
      { rotation: 0, w: d.width, l: d.length },
      ...(canRotate ? [{ rotation: 90, w: d.length, l: d.width }] : []),
    ].filter(o => o.w <= TW);

    let chosen = options.find(o => cursorX + o.w + spacing <= TW) || options[0];
    if (!chosen) { skipped.push(item); continue; }

    if (cursorX + chosen.w > TW) {
      // start a new row
      rowY += rowHeight + spacing;
      rowHeight = 0;
      cursorX = 0;
      chosen = options.reduce((best, o) => (o.l < best.l ? o : best), options[0]);
    }
    if (rowY + chosen.l > TL) { skipped.push(item); continue; }

    placed.push({
      ...item,
      x: cursorX,
      y: rowY,
      rotation: chosen.rotation,
      stackedOn: null,
    });

    cursorX += chosen.w + spacing;
    rowHeight = Math.max(rowHeight, chosen.l);
  }

  if (centerHeavy) balanceRows(placed, TW);
  return { placed, skipped };
}

/** Shift each row so its cargo is centred laterally — keeps mass near the centre line. */
function balanceRows(placed: PlacedPallet[], TW: number) {
  const rows = new Map<number, PlacedPallet[]>();
  for (const p of placed) {
    const list = rows.get(p.y) || [];
    list.push(p);
    rows.set(p.y, list);
  }
  for (const list of rows.values()) {
    const width = list.reduce((s, p) => {
      const d = dims(p);
      return s + (p.rotation === 90 ? d.length : d.width);
    }, 0);
    const offset = Math.max(0, Math.round((TW - width) / 2));
    let x = offset;
    list.sort((a, b) => a.x - b.x);
    for (const p of list) {
      const d = dims(p);
      p.x = x;
      x += p.rotation === 90 ? d.length : d.width;
    }
  }
}

/** Optimize purely for axle/lateral balance: heaviest cargo toward deck centre. */
export function optimizeWeight(trailer: CustomTrailer, pallets: PlacedPallet[]) {
  return autoArrange(trailer, pallets, { centerHeavy: true });
}

/** Optimize for multi-stop delivery order. */
export function optimizeStops(trailer: CustomTrailer, pallets: PlacedPallet[]) {
  return autoArrange(trailer, pallets, { respectStops: true, centerHeavy: false });
}