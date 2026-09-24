import { Package, Layers, Weight, Gauge, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useLayoutPlannerSummary } from "./LayoutPlannerContext";
import { cn } from "@/lib/utils";

/**
 * Persistent planner status strip visible across all Layout Planner tabs.
 * Replaces the prior chip row with a single calm strip:
 * Items · Weight bar · Capacity bar · Utilization ring · Validation pill.
 */
export const PlannerSummaryBar = () => {
  const { summary } = useLayoutPlannerSummary();

  const inventory = summary.inventory ?? 0;
  const palletsBuilt = summary.palletsBuilt ?? 0;
  const loaded = summary.loaded ?? 0;
  const weight = summary.weightLbs ?? 0;
  const util = summary.utilization ?? 0;
  const warnings = summary.warnings ?? 0;

  const capacityPct = palletsBuilt > 0 ? Math.min(100, Math.round((loaded / palletsBuilt) * 100)) : 0;

  // Validation pill
  const validation = inventory === 0
    ? { label: "Empty", tone: "muted" as const, Icon: Package }
    : warnings > 0
    ? { label: "Warnings", tone: "warn" as const, Icon: AlertTriangle }
    : palletsBuilt > 0
    ? { label: "Ready", tone: "ok" as const, Icon: CheckCircle2 }
    : { label: "In progress", tone: "muted" as const, Icon: Package };

  const toneBg: Record<string, string> = {
    muted: "bg-muted/50 border-border/50 text-muted-foreground",
    warn: "bg-amber-500/10 border-amber-500/30 text-amber-700",
    ok: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700",
  };

  // Utilization ring
  const C = 2 * Math.PI * 13;
  const dash = (Math.max(0, Math.min(100, util)) / 100) * C;
  const utilColor = util > 95 ? "hsl(var(--destructive))" : util >= 80 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";

  return (
    <div className="border-b bg-card/30">
      <div className="max-w-[1920px] mx-auto px-3 lg:px-8 py-2">
        <div className="flex items-center gap-3 lg:gap-5 flex-nowrap lg:flex-wrap overflow-x-auto scrollbar-hide -mx-1 px-1">
          {/* Items */}
          <Stat icon={Package} label="Inventory" value={inventory.toLocaleString()} />

          {/* Pallets built */}
          <Stat icon={Layers} label="Pallets" value={`${palletsBuilt}`} />

          {/* Weight bar */}
          <BarStat
            icon={Weight}
            label="Weight"
            value={`${weight.toLocaleString()} lbs`}
            pct={Math.min(100, util)}
            tone="primary"
          />

          {/* Capacity bar (loaded / built) */}
          <BarStat
            icon={Gauge}
            label="Capacity"
            value={`${loaded}/${palletsBuilt}`}
            pct={capacityPct}
            tone={capacityPct >= 100 ? "ok" : "primary"}
          />

          {/* Util ring */}
          <div className="flex items-center gap-2 shrink-0">
            <svg width="30" height="30" viewBox="0 0 30 30" className="-rotate-90">
              <circle cx="15" cy="15" r="13" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
              <circle
                cx="15" cy="15" r="13" fill="none"
                stroke={utilColor} strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={`${dash} ${C - dash}`}
              />
            </svg>
            <div className="leading-tight">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Utilization</div>
              <div className="text-xs font-semibold tabular-nums">{util}%</div>
            </div>
          </div>

          <div className="flex-1" />

          {/* Validation pill */}
          <div className={cn("flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-xs font-medium shrink-0", toneBg[validation.tone])}>
            <validation.Icon className="h-3.5 w-3.5" />
            {validation.label}
            {warnings > 0 && <span className="tabular-nums opacity-80">· {warnings}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-center gap-2 shrink-0">
    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    <span className="text-[10px] uppercase tracking-wide text-muted-foreground hidden md:inline">{label}</span>
    <span className="text-xs font-semibold tabular-nums">{value}</span>
  </div>
);

const BarStat = ({
  icon: Icon, label, value, pct, tone,
}: { icon: any; label: string; value: string; pct: number; tone: "primary" | "ok" }) => (
  <div className="flex items-center gap-2 min-w-[140px] lg:min-w-[160px] lg:flex-1 lg:max-w-[240px] shrink-0">
    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-[11px] tabular-nums font-medium">{value}</span>
      </div>
      <div className="h-1 mt-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", tone === "ok" ? "bg-emerald-500" : "bg-primary")}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  </div>
);