import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Lightbulb, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  RotateCw, Maximize2, Weight, AlertTriangle, CheckCircle2,
  Gauge, TrendingUp, Package, Zap, Info, MapPin, Route
} from "lucide-react";
import { PlacedPallet, getStopColor } from "@/types/trailer-builder";
import { CustomTrailer } from "@/hooks/use-custom-trailers";
import {
  analyzeLoad,
  generateRecommendations,
  EfficiencyGrade,
  Recommendation,
} from "@/lib/trailer-load-analysis";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LoadIntelligencePanelProps {
  trailer: CustomTrailer | null;
  placedPallets: PlacedPallet[];
  onApplyRecommendation: (palletId: string, updates: Partial<PlacedPallet>) => void;
  onBulkUpdate?: (updates: { palletId: string; updates: Partial<PlacedPallet> }[]) => void;
}

const gradeColors: Record<EfficiencyGrade, string> = {
  "A+": "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  "A": "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  "B": "text-sky-500 bg-sky-500/10 border-sky-500/30",
  "C": "text-amber-500 bg-amber-500/10 border-amber-500/30",
  "D": "text-orange-500 bg-orange-500/10 border-orange-500/30",
  "F": "text-red-500 bg-red-500/10 border-red-500/30",
};

const priorityConfig = {
  high: { color: "text-red-500", bg: "bg-red-500/10", label: "High" },
  medium: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Med" },
  low: { color: "text-sky-500", bg: "bg-sky-500/10", label: "Low" },
};

const recIcon: Record<string, typeof ArrowUp> = {
  move_forward: ArrowUp,
  move_backward: ArrowDown,
  move_left: ArrowLeft,
  move_right: ArrowRight,
  rotate: RotateCw,
  consolidate_gap: Maximize2,
  weight_balance: Weight,
  additional_capacity: Package,
  stack_opportunity: TrendingUp,
  sequence_warning: AlertTriangle,
  sequence_optimize: Route,
};

export const LoadIntelligencePanel = ({
  trailer,
  placedPallets,
  onApplyRecommendation,
  onBulkUpdate,
}: LoadIntelligencePanelProps) => {
  const metrics = useMemo(() => {
    if (!trailer || placedPallets.length === 0) return null;
    return analyzeLoad(trailer, placedPallets);
  }, [trailer, placedPallets]);

  const recommendations = useMemo(() => {
    if (!trailer || placedPallets.length === 0) return [];
    return generateRecommendations(trailer, placedPallets);
  }, [trailer, placedPallets]);

  if (!trailer) {
    return (
      <Card className="h-full border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Load Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Select a trailer and place pallets to see optimization insights.</p>
        </CardContent>
      </Card>
    );
  }

  if (placedPallets.length === 0) {
    return (
      <Card className="h-full border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Load Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center">
              <Zap className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">Place pallets on the trailer to get load optimization insights.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const seq = metrics?.sequence;

  return (
    <Card className="h-full flex flex-col border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Load Intelligence
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {metrics && (
            <div className="space-y-4">
              {/* Grade */}
              <div className="flex items-center gap-3">
                <div className={cn("w-14 h-14 rounded-xl border-2 flex items-center justify-center font-bold text-xl", gradeColors[metrics.grade])}>
                  {metrics.grade}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Load Efficiency Score</p>
                  <p className="text-xs text-muted-foreground">{metrics.loadEfficiencyScore}/100</p>
                </div>
              </div>

              {/* Metric bars */}
              <div className="space-y-3">
                <MetricBar label="Space Efficiency" value={metrics.spaceUtilization}
                  detail={`${metrics.usedArea.toLocaleString()} / ${metrics.totalArea.toLocaleString()} sq in`}
                  color={metrics.spaceUtilization > 75 ? "emerald" : metrics.spaceUtilization > 50 ? "amber" : "red"} />
                <MetricBar label="Weight Utilization" value={Math.min(metrics.weightUtilization, 100)}
                  detail={`${metrics.totalWeight.toLocaleString()} / ${(metrics.totalWeight + metrics.remainingWeight).toLocaleString()} lbs`}
                  color={metrics.weightUtilization > 100 ? "red" : metrics.weightUtilization > 75 ? "emerald" : "amber"}
                  warning={metrics.weightUtilization > 100 ? "Over limit!" : undefined} />
              </div>

              {/* Balance */}
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" /> Weight Balance</span>
                  {metrics.weightBalance.isBalanced ? (
                    <Badge variant="secondary" className="text-[10px] gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Balanced</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] gap-1 text-amber-500 border-amber-500/30"><AlertTriangle className="h-3 w-3" /> Imbalanced</Badge>
                  )}
                </div>
                <div className="relative w-full aspect-[2/3] max-h-[80px] bg-muted/30 rounded border border-border overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-px h-full bg-border absolute left-1/2" />
                    <div className="h-px w-full bg-border absolute top-1/2" />
                  </div>
                  <div className={cn("absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-background shadow-sm",
                    metrics.weightBalance.isBalanced ? "bg-emerald-500" : "bg-amber-500")}
                    style={{ left: `${metrics.weightBalance.cogX * 100}%`, top: `${metrics.weightBalance.cogY * 100}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                  <span>Front: {metrics.weightBalance.frontWeight.toLocaleString()}lb</span>
                  <span>Rear: {metrics.weightBalance.rearWeight.toLocaleString()}lb</span>
                </div>
              </div>

              {/* Sequence insights */}
              {seq && seq.totalStops > 0 && (
                <>
                  <Separator />
                  <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <Route className="h-3.5 w-3.5 text-primary" /> Delivery Sequence
                      </span>
                      <Badge variant={seq.sequenceEfficiency >= 80 ? "secondary" : "outline"}
                        className={cn("text-[10px]", seq.sequenceEfficiency < 80 && "text-amber-500 border-amber-500/30")}>
                        {seq.sequenceEfficiency}%
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-background rounded p-1.5">
                        <p className="text-lg font-bold text-primary">{seq.totalStops}</p>
                        <p className="text-[9px] text-muted-foreground">Stops</p>
                      </div>
                      <div className="bg-background rounded p-1.5">
                        <p className="text-lg font-bold">{seq.totalLoadsWithStops}</p>
                        <p className="text-[9px] text-muted-foreground">Loads</p>
                      </div>
                      <div className="bg-background rounded p-1.5">
                        <p className={cn("text-lg font-bold", seq.sequenceEfficiency >= 80 ? "text-emerald-500" : "text-amber-500")}>
                          {seq.sequenceEfficiency}%
                        </p>
                        <p className="text-[9px] text-muted-foreground">Efficiency</p>
                      </div>
                    </div>

                    {/* Stop breakdown */}
                    <div className="space-y-1">
                      {seq.stopSummary.map(s => {
                        const sc = getStopColor(s.stop);
                        return (
                          <div key={s.stop} className="flex items-center gap-2 text-xs">
                            <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{ backgroundColor: sc.bg, color: sc.text }}>{s.stop}</div>
                            <span className="flex-1 truncate">
                              {s.destination || `Stop ${s.stop}`}
                            </span>
                            <span className="text-muted-foreground">{s.count} load{s.count > 1 ? "s" : ""}</span>
                          </div>
                        );
                      })}
                    </div>

                    {seq.blockingIssues.length > 0 && (
                      <div className="rounded bg-destructive/10 border border-destructive/20 p-2">
                        <p className="text-[10px] font-semibold text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {seq.blockingIssues.length} blocking issue{seq.blockingIssues.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Additional capacity */}
              {metrics.estimatedAdditionalPallets > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                  <Package className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs">
                    <span className="font-semibold text-primary">~{metrics.estimatedAdditionalPallets} more</span>{" "}
                    <span className="text-muted-foreground">could fit</span>
                  </p>
                </div>
              )}

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" /> Recommendations</h3>
                      <span className="text-[10px] text-muted-foreground">{recommendations.length}</span>
                    </div>
                    <div className="space-y-2">
                      {recommendations.map((rec) => (
                        <RecommendationCard key={rec.id} rec={rec} onApply={onApplyRecommendation} onBulkApply={onBulkUpdate} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {recommendations.length === 0 && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 py-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <p className="text-xs text-muted-foreground">Layout looks well-optimized.</p>
                  </div>
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// --- Sub-components ---

function MetricBar({ label, value, detail, color, warning }: {
  label: string; value: number; detail: string; color: "emerald" | "amber" | "red"; warning?: string;
}) {
  const barColor = { emerald: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" }[color];
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          {warning && <span className="text-[10px] text-red-500 font-semibold">{warning}</span>}
          <span className="text-xs font-semibold">{value.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5">{detail}</p>
    </div>
  );
}

function RecommendationCard({ rec, onApply, onBulkApply }: {
  rec: Recommendation;
  onApply: (palletId: string, updates: Partial<PlacedPallet>) => void;
  onBulkApply?: (updates: { palletId: string; updates: Partial<PlacedPallet> }[]) => void;
}) {
  const Icon = recIcon[rec.type] || Info;
  const pConfig = priorityConfig[rec.priority];

  const handleApply = () => {
    if (rec.bulkUpdates && onBulkApply) {
      onBulkApply(rec.bulkUpdates);
      toast.success("Layout optimized for delivery order");
    } else if (rec.appliedUpdate) {
      onApply(rec.appliedUpdate.palletId, rec.appliedUpdate.updates);
    }
  };

  const canApply = rec.appliedUpdate || (rec.bulkUpdates && onBulkApply);

  return (
    <div className="rounded-lg border border-border bg-background p-2.5 space-y-1.5">
      <div className="flex items-start gap-2">
        <div className={cn("mt-0.5 p-1 rounded", pConfig.bg)}>
          <Icon className={cn("h-3.5 w-3.5", pConfig.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold truncate">{rec.title}</p>
            <Badge variant="outline" className={cn("text-[9px] px-1 py-0 shrink-0", pConfig.color)}>{pConfig.label}</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{rec.description}</p>
        </div>
      </div>
      {canApply && (
        <Button size="sm" variant={rec.type === "sequence_optimize" ? "default" : "secondary"} className="w-full h-7 text-xs" onClick={handleApply}>
          {rec.type === "sequence_optimize" ? (
            <><Route className="h-3 w-3 mr-1" /> Optimize for Delivery Order</>
          ) : (
            <><Zap className="h-3 w-3 mr-1" /> Apply Suggestion</>
          )}
        </Button>
      )}
    </div>
  );
}
