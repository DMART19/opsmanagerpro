import { Truck, AlertTriangle } from "lucide-react";
import { CustomTrailer } from "@/hooks/use-custom-trailers";
import { TrailerLoadScore } from "@/lib/trailer-load-score";
import { cn } from "@/lib/utils";

interface Props {
  trailer: CustomTrailer;
  score: TrailerLoadScore | null;
  loaded: number;
}

/**
 * Slim status strip pinned above the canvas. Replaces the scattered chip row
 * with progress bars for weight + capacity and an inline warnings pill.
 */
export const VehicleStatusStrip = ({ trailer, score, loaded }: Props) => {
  const weight = score?.totalWeight ?? 0;
  const maxWeight = trailer.max_weight || 1;
  const weightPct = Math.min(100, Math.round((weight / maxWeight) * 100));
  const util = score?.utilization ?? 0;
  const warnings = score?.warnings ?? 0;
  const critical = score?.criticalWarnings ?? 0;

  const C = 2 * Math.PI * 12;
  const dash = (Math.max(0, Math.min(100, util)) / 100) * C;
  const utilColor =
    util > 95 ? "hsl(var(--destructive))" : util >= 80 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-5 rounded-xl border border-border/50 bg-card/70 backdrop-blur-sm px-3 sm:px-4 py-2.5 shadow-sm">
      {/* Identity */}
      <div className="flex items-center gap-2 shrink-0 min-w-0 max-w-full">
        <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          <Truck className="h-3.5 w-3.5" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-[13px] font-semibold truncate">{trailer.name}</div>
          <div className="text-[10px] text-muted-foreground tabular-nums">
            {trailer.length}" × {trailer.width}" × {trailer.height}"
          </div>
        </div>
      </div>

      <div className="hidden sm:block w-px self-stretch bg-border/60" />

      {/* Weight bar */}
      <Bar
        label="Weight"
        valueLabel={`${weight.toLocaleString()} / ${maxWeight.toLocaleString()} lbs`}
        pct={weightPct}
        tone={weightPct >= 100 ? "danger" : weightPct >= 90 ? "warn" : "primary"}
      />

      {/* Capacity bar */}
      <Bar
        label="Capacity"
        valueLabel={`${util}%`}
        pct={util}
        tone={util >= 95 ? "danger" : util >= 80 ? "primary" : "muted"}
      />

      {/* Pallets loaded — hidden on mobile because coach card already shows it */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <div className="leading-tight">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Loaded</div>
          <div className="text-[13px] font-semibold tabular-nums">{loaded}</div>
        </div>
      </div>

      {/* Util ring */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90">
          <circle cx="14" cy="14" r="12" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
          <circle
            cx="14" cy="14" r="12" fill="none"
            stroke={utilColor} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={`${dash} ${C - dash}`}
          />
        </svg>
        <div className="leading-tight">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Utilization</div>
          <div className="text-[12px] font-semibold tabular-nums">{util}%</div>
        </div>
      </div>

      <div className="flex-1 hidden sm:block" />

      {/* Warnings pill */}
      <div
        className={cn(
          "flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-medium shrink-0 ml-auto sm:ml-0",
          critical > 0
            ? "bg-destructive/10 border-destructive/30 text-destructive"
            : warnings > 0
            ? "bg-amber-500/10 border-amber-500/30 text-amber-700"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {warnings === 0 ? "No warnings" : `${warnings} warning${warnings === 1 ? "" : "s"}`}
      </div>
    </div>
  );
};

const Bar = ({
  label, valueLabel, pct, tone,
}: { label: string; valueLabel: string; pct: number; tone: "primary" | "warn" | "danger" | "muted" }) => (
  <div className="flex flex-col gap-1 min-w-[120px] sm:min-w-[150px] flex-1 max-w-full sm:max-w-[260px] basis-[45%] sm:basis-auto">
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-[11px] tabular-nums font-medium">{valueLabel}</span>
    </div>
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          tone === "danger" && "bg-destructive",
          tone === "warn" && "bg-amber-500",
          tone === "primary" && "bg-primary",
          tone === "muted" && "bg-muted-foreground/50",
        )}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  </div>
);