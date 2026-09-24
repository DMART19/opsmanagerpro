/**
 * Wraps the existing trailer auto-pack engine. Takes PlannedPallets and
 * a vehicle preset, returns a unified TrailerPlan with loading sequence
 * and a simple axle estimate.
 */
import { autoPackTrailer } from "@/lib/trailer-auto-pack";
import type { CustomTrailer } from "@/hooks/use-custom-trailers";
import type { SavedPalletBuild } from "@/hooks/use-saved-pallet-builds";
import type { PlannedPallet, TrailerPlan, VehiclePreset } from "./types";

function plannedToSaved(p: PlannedPallet): SavedPalletBuild {
  return {
    id: p.id,
    name: `Pallet ${p.index}`,
    is_template: false,
    pallet_data: {
      selectedPalletId: p.pallet.id,
      selectedPalletType: "preset",
      palletDimensions: { width: p.pallet.width, length: p.pallet.length },
      maxWeight: p.pallet.maxWeight,
      placedCases: p.placedCases,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function vehicleToTrailer(v: VehiclePreset): CustomTrailer {
  return {
    id: v.id, name: v.name,
    length: v.length, width: v.width, height: v.height,
    max_weight: v.maxWeight, notes: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}

export function buildTrailerPlan(pallets: PlannedPallet[], vehicle: VehiclePreset): TrailerPlan {
  const saved = pallets.map(plannedToSaved);
  const result = autoPackTrailer(vehicleToTrailer(vehicle), saved);

  const placedPallets: PlannedPallet[] = result.placed
    .map((pp) => pallets.find((p) => p.id === pp.palletId))
    .filter((p): p is PlannedPallet => Boolean(p));

  const skippedPalletIds = pallets
    .filter((p) => !result.placed.some((pp) => pp.palletId === p.id))
    .map((p) => p.id);

  // Loading sequence: order by y descending (back of trailer loaded first = LIFO)
  const sequence = [...result.placed]
    .sort((a, b) => b.y - a.y)
    .map((pp, i) => ({ palletId: pp.palletId, step: i + 1 }));

  // Axle estimate using simple beam moment:
  //   For each pallet at position y (from nose), compute (weight * y),
  //   then split between front (steer), drive, and trailer axles.
  let totalMoment = 0;
  let totalWeight = 0;
  for (const pp of result.placed) {
    const planned = pallets.find((p) => p.id === pp.palletId);
    if (!planned) continue;
    const yCenter = pp.y + vehicle.width / 2;
    totalMoment += planned.weight * yCenter;
    totalWeight += planned.weight;
  }
  const cog = totalWeight > 0 ? totalMoment / totalWeight : 0;
  // Naïve split: front gets 15%, drive 45%, trailer 40% baseline, shifted by CoG.
  const front = Math.round(totalWeight * 0.15);
  const driveBase = totalWeight * 0.45;
  const trailerBase = totalWeight * 0.40;
  const shift = vehicle.length > 0 ? (cog / vehicle.length - 0.5) * 0.2 : 0;
  const drive = Math.round(driveBase * (1 - shift));
  const trailer = Math.round(trailerBase * (1 + shift));

  const alerts: string[] = [];
  if (totalWeight > vehicle.maxWeight) alerts.push(`Overweight by ${Math.round(totalWeight - vehicle.maxWeight)} lb`);
  if (Math.abs(shift) > 0.2) alerts.push("Unbalanced load — shift heavy pallets toward center");
  if (result.floorUtilization < 50) alerts.push("Low floor utilization — consider a smaller vehicle");
  if (skippedPalletIds.length) alerts.push(`${skippedPalletIds.length} pallet(s) did not fit — may need a second trip`);

  const trailerCubeIn = vehicle.width * vehicle.length * vehicle.height;
  const usedCubeIn = placedPallets.reduce(
    (s, p) => s + p.pallet.width * p.pallet.length * p.pallet.maxHeight, 0
  );

  return {
    vehicle,
    placedPallets,
    positioned: result.placed,
    skippedPalletIds,
    utilization: result.floorUtilization,
    totalWeight,
    remainingCube: Math.max(0, (trailerCubeIn - usedCubeIn) / 1728),
    loadingSequence: sequence,
    axleEstimate: { front, drive, trailer },
    alerts,
  };
}