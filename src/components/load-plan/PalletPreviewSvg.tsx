import type { PlannedPallet } from "@/lib/load-plan/types";

/** Top-down SVG of a single planned pallet's first layer. */
export const PalletPreviewSvg = ({ pallet, size = 140 }: { pallet: PlannedPallet; size?: number }) => {
  const scale = size / Math.max(pallet.pallet.width, pallet.pallet.length);
  const w = pallet.pallet.width * scale;
  const h = pallet.pallet.length * scale;
  const firstLayer = pallet.placedCases.filter((c) => c.z === 0);
  return (
    <svg width={w} height={h} className="border border-border bg-muted/40 rounded">
      {firstLayer.map((c) => {
        const cw = (c.rotation === 90 ? c.length : c.width) * scale;
        const cl = (c.rotation === 90 ? c.width : c.length) * scale;
        return (
          <rect
            key={c.id}
            x={c.x * scale} y={c.y * scale} width={cw} height={cl}
            fill="hsl(var(--primary) / 0.4)" stroke="hsl(var(--primary))" strokeWidth={0.75}
          />
        );
      })}
    </svg>
  );
};

export const TrailerPreviewSvg = ({
  vehicleWidth, vehicleLength, positioned, sequence,
}: {
  vehicleWidth: number;
  vehicleLength: number;
  positioned: { id: string; palletId: string; x: number; y: number; rotation: number; palletData: { pallet_data: { palletDimensions: { width: number; length: number } } } }[];
  sequence: { palletId: string; step: number }[];
}) => {
  const target = 320;
  const scale = target / Math.max(vehicleWidth, vehicleLength);
  const w = vehicleWidth * scale;
  const h = vehicleLength * scale;
  return (
    <svg width={w} height={h} className="border-2 border-border rounded bg-muted/30">
      {positioned.map((pp) => {
        const d = pp.palletData.pallet_data.palletDimensions;
        const pw = (pp.rotation === 90 ? d.length : d.width) * scale;
        const pl = (pp.rotation === 90 ? d.width : d.length) * scale;
        const step = sequence.find((s) => s.palletId === pp.palletId)?.step;
        return (
          <g key={pp.id}>
            <rect
              x={pp.x * scale} y={pp.y * scale} width={pw} height={pl}
              fill="hsl(var(--primary) / 0.35)" stroke="hsl(var(--primary))" strokeWidth={1}
            />
            {step && (
              <text x={pp.x * scale + pw / 2} y={pp.y * scale + pl / 2 + 4}
                    textAnchor="middle" fontSize={12} fontWeight={600} fill="hsl(var(--foreground))">
                {step}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};