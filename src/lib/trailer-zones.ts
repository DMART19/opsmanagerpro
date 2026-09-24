/**
 * Trailer zone utilities for logistics-aware load planning.
 *
 * Divides a trailer lengthwise into three zones:
 *   - Front Zone (nose/cab end): 0% – 33% of trailer length
 *   - Mid Zone (middle section): 33% – 66%
 *   - Door Zone (rear/unloading end): 66% – 100%
 *
 * Y=0 is the cab (front). Y=trailerLength is the door (rear).
 */

export type TrailerZoneId = "front" | "mid" | "door";

export interface TrailerZone {
  id: TrailerZoneId;
  label: string;
  shortLabel: string;
  /** Logistics recommendation for this zone */
  recommendation: string;
  /** 0-1 fraction of trailer length where zone starts */
  startFrac: number;
  /** 0-1 fraction of trailer length where zone ends */
  endFrac: number;
  /** HSL background color at low opacity */
  bg: string;
  /** Border color for highlight */
  border: string;
  /** Text/badge color */
  text: string;
}

export const TRAILER_ZONES: TrailerZone[] = [
  {
    id: "front",
    label: "Front Zone",
    shortLabel: "Front",
    recommendation: "Recommended for heavier loads",
    startFrac: 0,
    endFrac: 1 / 3,
    bg: "hsl(200 65% 55% / 0.06)",
    border: "hsl(200 65% 55% / 0.35)",
    text: "hsl(200 65% 55%)",
  },
  {
    id: "mid",
    label: "Mid Zone",
    shortLabel: "Mid",
    recommendation: "General placement",
    startFrac: 1 / 3,
    endFrac: 2 / 3,
    bg: "hsl(45 60% 55% / 0.05)",
    border: "hsl(45 60% 55% / 0.30)",
    text: "hsl(45 60% 55%)",
  },
  {
    id: "door",
    label: "Door Zone",
    shortLabel: "Door",
    recommendation: "Recommended for first-stop deliveries",
    startFrac: 2 / 3,
    endFrac: 1,
    bg: "hsl(142 55% 45% / 0.06)",
    border: "hsl(142 55% 45% / 0.35)",
    text: "hsl(142 55% 45%)",
  },
];

/**
 * Determine which zone a load occupies based on its Y center.
 * Y=0 is the cab (front). trailerLength is the door (rear).
 */
export function getLoadZone(
  loadY: number,
  loadHeight: number,
  trailerLength: number
): TrailerZone {
  const center = loadY + loadHeight / 2;
  const frac = center / trailerLength;
  return (
    TRAILER_ZONES.find((z) => frac >= z.startFrac && frac < z.endFrac) ??
    TRAILER_ZONES[2] // default to door if exactly at end
  );
}

/**
 * Get pixel bounds for a zone given trailer length in inches and scale factor.
 */
export function getZonePixelBounds(
  zone: TrailerZone,
  trailerLength: number,
  scale: number
) {
  return {
    top: zone.startFrac * trailerLength * scale,
    height: (zone.endFrac - zone.startFrac) * trailerLength * scale,
  };
}
