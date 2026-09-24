/**
 * Non-blocking smart warnings for the Trailer Load Builder.
 * Each warning points at the cargo it affects so the UI can highlight it.
 */
import { CustomTrailer } from "@/hooks/use-custom-trailers";
import { PlacedPallet } from "@/types/trailer-builder";
import { AxleAnalysis } from "@/lib/trailer-axle-analysis";
import {
  cargoOf, footprintOf, topHeightOf, weightAboveOf,
} from "@/lib/trailer-cargo";

export type WarningSeverity = "critical" | "warning" | "info";

export interface SmartWarning {
  id: string;
  severity: WarningSeverity;
  message: string;
  cargoIds: string[];
}

const near = (a: PlacedPallet, b: PlacedPallet) => {
  const fa = footprintOf(a);
  const fb = footprintOf(b);
  const gap = 12;
  return (
    a.x - gap < b.x + fb.w && b.x - gap < a.x + fa.w &&
    a.y - gap < b.y + fb.l && b.y - gap < a.y + fa.l
  );
};

export function buildSmartWarnings(
  trailer: CustomTrailer | null,
  pallets: PlacedPallet[],
  axles: AxleAnalysis | null
): SmartWarning[] {
  if (!trailer || pallets.length === 0) return [];
  const out: SmartWarning[] = [];

  if (axles?.overloaded) {
    out.push({
      id: "overloaded",
      severity: "critical",
      message: `Trailer overloaded by ${(axles.totalWeight - axles.maxWeight).toLocaleString()} lbs`,
      cargoIds: pallets.map(p => p.id),
    });
  }
  if (axles && axles.rearAxle > axles.rearLimit) {
    out.push({
      id: "rear-axle",
      severity: "critical",
      message: "Rear axle overloaded — shift weight forward",
      cargoIds: pallets.filter(p => p.y > trailer.length * 0.6).map(p => p.id),
    });
  }
  if (axles && axles.driveAxle > axles.driveLimit) {
    out.push({
      id: "drive-axle",
      severity: "critical",
      message: "Drive axle overloaded — shift weight rearward",
      cargoIds: pallets.filter(p => p.y < trailer.length * 0.4).map(p => p.id),
    });
  }
  if (axles && Math.abs(axles.lateralBias) > 0.15) {
    const heavySide = axles.lateralBias > 0 ? "Right" : "Left";
    out.push({
      id: "lateral",
      severity: "warning",
      message: `${heavySide} side imbalance (${Math.round(Math.abs(axles.lateralBias) * 100)}%)`,
      cargoIds: pallets
        .filter(p =>
          axles.lateralBias > 0
            ? p.x + footprintOf(p).w / 2 > trailer.width / 2
            : p.x + footprintOf(p).w / 2 < trailer.width / 2
        )
        .map(p => p.id),
    });
  }
  if (axles && Math.abs(axles.longitudinalBias) > 0.25) {
    out.push({
      id: "long-bias",
      severity: "warning",
      message: axles.longitudinalBias > 0 ? "Load is too rear-heavy" : "Load is too front-heavy",
      cargoIds: [],
    });
  }

  // Height clearance
  const tooTall = pallets.filter(p => topHeightOf(p, pallets) > (trailer.height || Infinity));
  if (tooTall.length) {
    out.push({
      id: "height",
      severity: "critical",
      message: `${tooTall.length} item${tooTall.length > 1 ? "s" : ""} exceed trailer height`,
      cargoIds: tooTall.map(p => p.id),
    });
  }

  // Fragile with weight above
  const crushed = pallets.filter(p => cargoOf(p).fragile && weightAboveOf(p, pallets) > 0);
  if (crushed.length) {
    out.push({
      id: "fragile",
      severity: "critical",
      message: "Fragile cargo has weight stacked above it",
      cargoIds: crushed.map(p => p.id),
    });
  }

  // Hazmat adjacency
  const hazmat = pallets.filter(p => cargoOf(p).hazmat);
  const conflicts = new Set<string>();
  for (const h of hazmat) {
    for (const other of pallets) {
      if (other.id === h.id) continue;
      const c = cargoOf(other);
      if ((c.tempControlled || c.fragile) && near(h, other)) {
        conflicts.add(h.id);
        conflicts.add(other.id);
      }
    }
  }
  if (conflicts.size) {
    out.push({
      id: "hazmat",
      severity: "warning",
      message: "Hazmat placed adjacent to incompatible cargo",
      cargoIds: [...conflicts],
    });
  }

  // Delivery order efficiency: earlier stops should be nearer the door (high Y).
  const stopped = pallets.filter(p => p.stopNumber);
  if (stopped.length > 1) {
    const bad = stopped.filter(p =>
      stopped.some(o =>
        (o.stopNumber || 0) > (p.stopNumber || 0) && o.y > p.y
      )
    );
    if (bad.length) {
      out.push({
        id: "stops",
        severity: "info",
        message: "Delivery order is inefficient — later stops block earlier ones",
        cargoIds: bad.map(p => p.id),
      });
    }
  }

  // Securement reminders
  const needsStraps = pallets.filter(p => cargoOf(p).requiresStraps || cargoOf(p).requiresBlocking);
  if (needsStraps.length) {
    out.push({
      id: "securement",
      severity: "info",
      message: `${needsStraps.length} item${needsStraps.length > 1 ? "s" : ""} require blocking or straps`,
      cargoIds: needsStraps.map(p => p.id),
    });
  }

  return out;
}