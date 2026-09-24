import { useState } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, ChevronDown, ChevronUp, Wand2, PanelRightClose, PanelRightOpen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CapacityBar } from "@/components/ui/capacity-bar";
import { PalletHealthReport, PalletRecommendation } from "@/lib/pallet-recommendations";
import { PalletConfig } from "@/pages/PalletBuilder";

interface Props {
  report: PalletHealthReport;
  selectedPallet: PalletConfig | null;
  totalWeight: number;
  utilization: number;
  onApplyRecommendation: (rec: PalletRecommendation) => void;
  onFocusCase?: (caseId: string) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const statusMeta = {
  healthy: { label: "Ready to Save", tone: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/30", Icon: CheckCircle2 },
  attention: { label: "Needs Review", tone: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30", Icon: AlertTriangle },
  unsafe: { label: "Not Safe", tone: "text-destructive", bg: "bg-destructive/10 border-destructive/30", Icon: AlertCircle },
} as const;

/**
 * Simplified Pallet Status panel.
 * Surfaces 3 plain-language checks + overall status.
 * Advanced metrics, capacity bars, and full recommendations live in collapsed Details.
 */
export const PalletHealthPanel = ({
  report,
  selectedPallet,
  totalWeight,
  utilization,
  onApplyRecommendation,
  onFocusCase,
  collapsed = false,
  onToggleCollapsed,
}: Props) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const meta = statusMeta[report.status];
  const StatusIcon = meta.Icon;

  const weightOk = !selectedPallet || totalWeight <= selectedPallet.maxWeight;
  const stable = report.checks.every(c => c.status !== "critical");
  const withinLimits = report.recommendations.every(r => r.severity !== "critical");

  const simpleChecks = [
    { label: "Weight OK", ok: weightOk },
    { label: "Stable", ok: stable },
    { label: "Within Limits", ok: withinLimits },
  ];

  const criticalRecs = report.recommendations.filter(r => r.severity === "critical");
  const warningCount = report.recommendations.filter(r => r.severity !== "optimization").length;

  if (collapsed) {
    return (
      <div className="h-full w-10 flex flex-col items-center gap-2 bg-background border-l border-border/40 py-2">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          aria-label="Expand insights panel"
          title="Expand insights"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
        <div className="w-6 h-px bg-border/60" />
        <div
          className={cn(
            "h-8 w-8 rounded-md flex items-center justify-center",
            report.status === "healthy" && "text-emerald-600",
            report.status === "attention" && "text-amber-600",
            report.status === "unsafe" && "text-destructive",
          )}
          title={meta.label}
        >
          <StatusIcon className="h-4 w-4" />
        </div>
        {warningCount > 0 && (
          <div className="h-8 w-8 rounded-md flex items-center justify-center text-amber-600 relative" title={`${warningCount} warnings`}>
            <AlertTriangle className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold bg-amber-500 text-white rounded-full h-3.5 w-3.5 flex items-center justify-center">
              {warningCount}
            </span>
          </div>
        )}
        {report.recommendations.length > 0 && (
          <div className="h-8 w-8 rounded-md flex items-center justify-center text-primary" title="Recommendations">
            <Sparkles className="h-4 w-4" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-background border-l border-border/40">
      <div className="px-5 py-3 border-b border-border/30 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Insights</h3>
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            aria-label="Collapse insights panel"
            title="Collapse"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Plain-language checks */}
      <div className="px-5 py-4 space-y-2.5 border-b border-border/30">
        {simpleChecks.map(c => (
          <div key={c.label} className="flex items-center gap-2.5 text-sm">
            {c.ok ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
          </div>
        ))}
      </div>

      {/* Overall status badge */}
      <div className="px-5 py-4 border-b border-border/30">
        <div className={cn("rounded-md border px-3 py-2.5 flex items-center gap-2.5", meta.bg)}>
          <StatusIcon className={cn("h-4 w-4", meta.tone)} />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</div>
            <div className={cn("text-sm font-semibold", meta.tone)}>{meta.label}</div>
          </div>
        </div>
      </div>

      {/* Critical issues — only shown when blocking */}
      {criticalRecs.length > 0 && (
        <div className="px-5 py-4 space-y-2 border-b border-border/30">
          <p className="text-[10px] uppercase tracking-wider text-destructive font-medium">Must Fix</p>
          {criticalRecs.map(rec => (
            <div key={rec.id} className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 space-y-1.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium leading-tight">{rec.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{rec.why}</div>
                </div>
              </div>
              {rec.apply && (
                <div className="pl-5">
                  <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] gap-1" onClick={() => onApplyRecommendation(rec)}>
                    <Wand2 className="h-3 w-3" /> Apply fix
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Collapsed Details — advanced metrics + remaining recommendations */}
      <div className="border-t border-border/30 mt-auto">
        <button
          type="button"
          onClick={() => setDetailsOpen(v => !v)}
          className="w-full px-5 py-2.5 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium hover:bg-muted/40 transition-colors"
        >
          Details
          {detailsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {detailsOpen && (
          <div className="px-5 pb-4 space-y-4">
            {selectedPallet && (
              <div className="space-y-3">
                <CapacityBar label="Weight" value={totalWeight} max={selectedPallet.maxWeight} unit="lbs" />
                <CapacityBar label="Area utilization" value={utilization} max={100} unit="%" compact />
              </div>
            )}

            {selectedPallet && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[11px] text-muted-foreground">Pallet</p>
                  <p className="font-semibold tabular-nums">{selectedPallet.width}" × {selectedPallet.length}"</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Max weight</p>
                  <p className="font-semibold tabular-nums">{selectedPallet.maxWeight.toLocaleString()} lbs</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] text-muted-foreground">Name</p>
                  <p className="font-medium truncate">{selectedPallet.name}</p>
                </div>
              </div>
            )}

            {report.recommendations.filter(r => r.severity !== "critical").length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Suggestions</p>
                {report.recommendations.filter(r => r.severity !== "critical").slice(0, 5).map(rec => (
                  <div key={rec.id} className="rounded-md border border-border/40 bg-muted/30 p-2.5 space-y-1">
                    <div className="text-xs font-medium leading-tight">{rec.title}</div>
                    <div className="text-[11px] text-muted-foreground">{rec.why}</div>
                    <div className="flex gap-1.5">
                      {rec.apply && (
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] gap-1" onClick={() => onApplyRecommendation(rec)}>
                          <Wand2 className="h-3 w-3" /> Apply
                        </Button>
                      )}
                      {rec.focusCaseId && onFocusCase && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => onFocusCase(rec.focusCaseId!)}>
                          Show
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};