import { Package, Weight, CheckCircle2, AlertTriangle, ArrowRight, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveMetricsHeaderProps {
  itemCount: number;
  totalWeight: number;
  maxWeight: number;
  weightUsage: number;
  utilization: number;
  layers: number;
  warnings: number;
  nextAction?: string | null;
  onWarningsClick?: () => void;
  onNextClick?: () => void;
}

/**
 * Simplified header for first-time users.
 * - Always shows: Items, Weight, Status, and a single Next Action.
 * - Advanced metrics (Utilization, Layers, Warnings) live in an expandable Details row.
 */
export const LiveMetricsHeader = ({
  itemCount,
  totalWeight,
  maxWeight,
  weightUsage,
  utilization,
  layers,
  warnings,
  nextAction,
  onWarningsClick,
  onNextClick,
}: LiveMetricsHeaderProps) => {
  void layers;
  const weightPct = Math.max(0, Math.min(100, Math.round(weightUsage)));
  const utilPct = Math.max(0, Math.min(100, Math.round(utilization)));
  const weightOk = weightUsage <= 100;
  const ready = itemCount > 0 && weightOk && warnings === 0;

  const validation = itemCount === 0
    ? { label: "Empty", tone: "muted", Icon: Package }
    : !weightOk
    ? { label: "Over weight", tone: "danger", Icon: AlertTriangle }
    : warnings > 0
    ? { label: "Warnings", tone: "warn", Icon: AlertTriangle }
    : { label: "Ready", tone: "ok", Icon: CheckCircle2 };

  const toneText: Record<string, string> = {
    muted: "text-muted-foreground",
    danger: "text-destructive",
    warn: "text-amber-600",
    ok: "text-emerald-600",
  };
  const toneBg: Record<string, string> = {
    muted: "bg-muted/50 border-border/50 text-muted-foreground",
    danger: "bg-destructive/10 border-destructive/30 text-destructive",
    warn: "bg-amber-500/10 border-amber-500/30 text-amber-700",
    ok: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700",
  };

  // Circumference for util ring (r=14)
  const C = 2 * Math.PI * 14;
  const dash = (utilPct / 100) * C;

  return (
    <div className="border-b border-border/40 bg-background">
      <div className="max-w-[1920px] mx-auto px-4 lg:px-6 py-2.5">
        <div className="flex items-center gap-5 flex-wrap">
          {/* Items */}
          <div className="flex items-center gap-2 shrink-0">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Items</span>
            <span className="text-sm font-semibold tabular-nums">{itemCount}</span>
          </div>

          {/* Weight progress */}
          <div className="flex items-center gap-2 min-w-[200px] flex-1 max-w-[280px]">
            <Weight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Weight</span>
                <span className={cn("text-[11px] tabular-nums font-medium", !weightOk && "text-destructive")}>
                  {totalWeight.toLocaleString()} / {maxWeight.toLocaleString()} lbs
                </span>
              </div>
              <div className="h-1.5 mt-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    !weightOk ? "bg-destructive" : weightPct > 85 ? "bg-amber-500" : "bg-primary"
                  )}
                  style={{ width: `${weightPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Capacity (items vs cube — proxied by weight usage % for "Capacity Used") */}
          <div className="flex items-center gap-2 min-w-[180px] flex-1 max-w-[260px]">
            <Gauge className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Capacity</span>
                <span className="text-[11px] tabular-nums font-medium">{weightPct}%</span>
              </div>
              <div className="h-1.5 mt-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    weightPct > 95 ? "bg-destructive" : weightPct > 80 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${weightPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Utilization ring */}
          <div className="flex items-center gap-2 shrink-0">
            <svg width="34" height="34" viewBox="0 0 34 34" className="-rotate-90">
              <circle cx="17" cy="17" r="14" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
              <circle
                cx="17" cy="17" r="14" fill="none"
                stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${dash} ${C - dash}`}
              />
            </svg>
            <div className="leading-tight">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Utilization</div>
              <div className="text-sm font-semibold tabular-nums">{utilPct}%</div>
            </div>
          </div>

          {/* Validation pill */}
          <div className={cn("flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-xs font-medium shrink-0", toneBg[validation.tone])}>
            <validation.Icon className="h-3.5 w-3.5" />
            {validation.label}
            {warnings > 0 && validation.tone !== "ok" && (
              <button
                type="button"
                onClick={onWarningsClick}
                className="ml-1 underline-offset-2 hover:underline"
              >
                ({warnings})
              </button>
            )}
          </div>

          <div className="flex-1" />

          {nextAction && (
            <button
              type="button"
              onClick={onNextClick}
              className={cn(
                "flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium shrink-0",
                "bg-primary/8 text-primary hover:bg-primary/12 transition-colors",
                toneText.ok && ready && ""
              )}
              title={nextAction}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span className="truncate max-w-[240px]">{nextAction}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};