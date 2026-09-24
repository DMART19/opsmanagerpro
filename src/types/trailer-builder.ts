import { SavedPalletBuild } from "@/hooks/use-saved-pallet-builds";
import type { CargoProperties } from "@/lib/trailer-cargo";

export interface PlacedPallet {
  id: string;
  palletId: string;
  x: number;
  y: number;
  /** Vertical position in inches (0 = trailer floor). Enables true 3D stacking. */
  z?: number;
  rotation: number;
  palletData: SavedPalletBuild;
  /** Advanced cargo properties (optional — defaults applied via cargoOf()). */
  cargo?: Partial<CargoProperties>;
  /** ID of the cargo this item is stacked on top of. */
  stackedOn?: string | null;
  /** Delivery stop number (1 = first delivery, closest to door) */
  stopNumber?: number;
  /** Optional destination label */
  destination?: string;
  /** Optional priority: high, medium, low */
  priority?: "high" | "medium" | "low";
}

/** Color palette for stop numbers */
export const STOP_COLORS: Record<number, { bg: string; border: string; text: string; label: string }> = {
  1: { bg: "hsl(142 70% 45% / 0.20)", border: "hsl(142 70% 45%)", text: "hsl(142 70% 45%)", label: "Stop 1" },
  2: { bg: "hsl(200 80% 50% / 0.20)", border: "hsl(200 80% 50%)", text: "hsl(200 80% 50%)", label: "Stop 2" },
  3: { bg: "hsl(45 90% 50% / 0.20)", border: "hsl(45 90% 50%)", text: "hsl(45 90% 50%)", label: "Stop 3" },
  4: { bg: "hsl(280 65% 55% / 0.20)", border: "hsl(280 65% 55%)", text: "hsl(280 65% 55%)", label: "Stop 4" },
  5: { bg: "hsl(15 80% 55% / 0.20)", border: "hsl(15 80% 55%)", text: "hsl(15 80% 55%)", label: "Stop 5" },
  6: { bg: "hsl(330 70% 55% / 0.20)", border: "hsl(330 70% 55%)", text: "hsl(330 70% 55%)", label: "Stop 6" },
};

export function getStopColor(stopNumber: number) {
  return STOP_COLORS[stopNumber] || STOP_COLORS[((stopNumber - 1) % 6) + 1];
}
