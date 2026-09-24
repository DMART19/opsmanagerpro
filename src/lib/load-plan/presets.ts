import type { PalletPreset, VehiclePreset } from "./types";

/** Standard pallet footprints (inches). Max height = 60", max weight tuned to common rates. */
export const PALLET_PRESETS: PalletPreset[] = [
  { id: "gma-48x40", name: '48"×40" GMA', width: 40, length: 48, maxHeight: 60, maxWeight: 2500 },
  { id: "sq-48x48", name: '48"×48" Square', width: 48, length: 48, maxHeight: 60, maxWeight: 2500 },
  { id: "euro-1200x800", name: "Euro 1200×800mm", width: 31.5, length: 47.2, maxHeight: 60, maxWeight: 2200 },
  { id: "half-48x20", name: '48"×20" Half', width: 20, length: 48, maxHeight: 60, maxWeight: 1200 },
];

/** Vehicle interior dims (inches). Wheelbase approximations for simple axle estimates. */
export const VEHICLE_PRESETS: VehiclePreset[] = [
  { id: "dryvan-53", name: "53' Dry Van", width: 99, length: 630, height: 110, maxWeight: 45000, wheelbase: 480 },
  { id: "pup-28", name: "28' Pup Trailer", width: 99, length: 336, height: 110, maxWeight: 22000, wheelbase: 240 },
  { id: "box-26", name: "26' Box Truck", width: 96, length: 312, height: 96, maxWeight: 10000, wheelbase: 180 },
  { id: "box-16", name: "16' Box Truck", width: 92, length: 192, height: 84, maxWeight: 6000, wheelbase: 138 },
  { id: "sprinter", name: "Sprinter Van", width: 70, length: 170, height: 70, maxWeight: 3500, wheelbase: 144 },
  { id: "flatbed-48", name: "48' Flatbed", width: 102, length: 576, height: 102, maxWeight: 48000, wheelbase: 432 },
];