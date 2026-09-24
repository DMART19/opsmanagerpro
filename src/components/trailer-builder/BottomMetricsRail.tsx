import { CustomTrailer } from "@/hooks/use-custom-trailers";
import { TrailerLoadScore } from "@/lib/trailer-load-score";
import { cn } from "@/lib/utils";

interface Props {
  trailer: CustomTrailer | null;
  score: TrailerLoadScore | null;
  loaded: number;
}

/**
 * Slim, persistent live-metrics rail pinned at the bottom of the workspace.
 * Pure presentation — derives everything from the existing load score.
 */
export const BottomMetricsRail = ({ trailer, score, loaded }: Props) => {
  const weight = score?.totalWeight ?? 0;
  const maxWeight = trailer?.max_weight ?? 0;
  const weightPct = maxWeight > 0 ? Math.min(100, Math.round((weight / maxWeight) * 100)) : 0;
  const util = score?.utilization ?? 0;
  const quality = score?.score ?? 0;
  const warnings = score?.warnings ?? 0;
  const critical = score?.criticalWarnings ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-border/50 border border-border/50 bg-card/70 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden h-11">
      <Cell label="Loaded" value={loaded.toString()} />
      <BarCell
        label="Weight"
        value={maxWeight ? `${weight.toLocaleString()} / ${maxWeight.toLocaleString()} lbs` : `${weight.toLocaleString()} lbs`}
        pct={weightPct}
        tone={weightPct >= 100 ? "danger" : weightPct >= 90 ? "warn" : "primary"}
      />
      <BarCell
        label="Capacity"
        value={`${util}%`}
        pct={util}
        tone={util >= 95 ? "danger" : "primary"}
      />
      <Cell label="Load Quality" value={`${quality}/100`} tone={quality >= 80 ? "ok" : quality >= 60 ? "warn" : "muted"} />
      <Cell
        label="Warnings"
        value={warnings.toString()}
        tone={critical > 0 ? "danger" : warnings > 0 ? "warn" : "muted"}
      />
    </div>
  );
};

const Cell = ({
  label, value, tone = "muted",
}: { label: string; value: string; tone?: "ok" | "warn" | "danger" | "muted" }) => (
  <div className="flex items-center gap-3 px-4 min-w-0">
    <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">{label}</span>
    <span
      className={cn(
        "text-[13px] font-semibold tabular-nums truncate",
        tone === "ok" && "text-emerald-600",
        tone === "warn" && "text-amber-600",
        tone === "danger" && "text-destructive",
      )}
    >
      {value}
    </span>
  </div>
);

const BarCell = ({
  label, value, pct, tone,
}: { label: string; value: string; pct: number; tone: "primary" | "warn" | "danger" }) => (
  <div className="flex items-center gap-3 px-4 min-w-0">
    <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">{label}</span>
    <div className="flex-1 min-w-0 flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden min-w-[40px]">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            tone === "danger" && "bg-destructive",
            tone === "warn" && "bg-amber-500",
            tone === "primary" && "bg-primary",
          )}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      <span className="text-[11px] font-medium tabular-nums shrink-0 text-foreground/80">{value}</span>
    </div>
  </div>
);