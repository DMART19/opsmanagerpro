/**
 * Live axle + lateral weight analysis for the Trailer Load Builder.
 * Estimates are simplified static-beam approximations suitable for planning.
 */
import { CustomTrailer } from "@/hooks/use-custom-trailers";
import { PlacedPallet } from "@/types/trailer-builder";
import { footprintOf, weightOf } from "@/lib/trailer-cargo";

export interface AxleAnalysis {
  totalWeight: number;
  maxWeight: number;
  remainingPayload: number;
  overloaded: boolean;
  /** Estimated loads, lbs */
  frontAxle: number;
  driveAxle: number;
  rearAxle: number;
  frontLimit: number;
  driveLimit: number;
  rearLimit: number;
  left: number;
  right: number;
  /** -1 (all left) .. 1 (all right) */
  lateralBias: number;
  /** -1 (nose heavy) .. 1 (tail heavy) */
  longitudinalBias: number;
}

export function analyzeAxles(
  trailer: CustomTrailer | null,
  pallets: PlacedPallet[]
): AxleAnalysis | null {
  if (!trailer) return null;
  const maxWeight = trailer.max_weight || 0;
  let total = 0;
  let left = 0;
  let right = 0;
  let momentY = 0; // weighted position along length (0 = nose)

  const midX = trailer.width / 2;

  for (const p of pallets) {
    const w = weightOf(p);
    if (w <= 0) continue;
    const { w: fw, l: fl } = footprintOf(p);
    const cx = p.x + fw / 2;
    const cy = p.y + fl / 2;
    total += w;
    momentY += w * cy;
    // Split weight proportionally across the centre line
    const leftShare = Math.min(1, Math.max(0, (midX - p.x) / fw));
    left += w * leftShare;
    right += w * (1 - leftShare);
    void cx;
  }

  const cogY = total > 0 ? momentY / total : trailer.length / 2;
  const norm = trailer.length > 0 ? cogY / trailer.length : 0.5;

  // Simplified distribution: kingpin ~15% from nose, tandems ~85% from nose.
  const kingpin = 0.15 * trailer.length;
  const tandem = 0.85 * trailer.length;
  const span = Math.max(1, tandem - kingpin);
  const tandemShare = Math.min(1, Math.max(0, (cogY - kingpin) / span));
  const kingpinLoad = total * (1 - tandemShare);
  const tandemLoad = total * tandemShare;

  // Kingpin load splits between steer and drive axles (~20/80).
  const frontAxle = kingpinLoad * 0.2;
  const driveAxle = kingpinLoad * 0.8;
  const rearAxle = tandemLoad;

  return {
    totalWeight: Math.round(total),
    maxWeight,
    remainingPayload: Math.max(0, Math.round(maxWeight - total)),
    overloaded: maxWeight > 0 && total > maxWeight,
    frontAxle: Math.round(frontAxle),
    driveAxle: Math.round(driveAxle),
    rearAxle: Math.round(rearAxle),
    frontLimit: 12000,
    driveLimit: 34000,
    rearLimit: 34000,
    left: Math.round(left),
    right: Math.round(right),
    lateralBias: total > 0 ? (right - left) / total : 0,
    longitudinalBias: (norm - 0.5) * 2,
  };
}