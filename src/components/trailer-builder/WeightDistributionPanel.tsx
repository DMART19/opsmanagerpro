import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Scale, AlertTriangle, CheckCircle2, ShieldAlert, Info,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Layers
} from "lucide-react";
import { PlacedPallet } from "@/types/trailer-builder";
import { CustomTrailer } from "@/hooks/use-custom-trailers";
import { analyzeWeightDistribution, WeightDistribution, WeightWarning } from "@/lib/trailer-load-analysis";
import { TRAILER_ZONES, getLoadZone } from "@/lib/trailer-zones";
import { cn } from "@/lib/utils";

interface WeightDistributionPanelProps {
  trailer: CustomTrailer | null;
  placedPallets: PlacedPallet[];
}

const severityConfig = {
  critical: { icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  info: { icon: Info, color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/30" },
};

export const WeightDistributionPanel = ({ trailer, placedPallets }: WeightDistributionPanelProps) => {
  const dist = useMemo(() => {
    if (!trailer || placedPallets.length === 0) return null;
    return analyzeWeightDistribution(trailer, placedPallets);
  }, [trailer, placedPallets]);

  if (!trailer) {
    return (
      <Card className="h-full border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            Weight Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Select a trailer to monitor weight distribution.</p>
        </CardContent>
      </Card>
    );
  }

  if (!dist || placedPallets.length === 0) {
    return (
      <Card className="h-full border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            Weight Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center">
              <Scale className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">Place pallets to see weight analysis.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            Weight Distribution
          </CardTitle>
          {dist.isBalanced ? (
            <Badge variant="secondary" className="text-[10px] gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Balanced</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] gap-1 text-amber-500 border-amber-500/30"><AlertTriangle className="h-3 w-3" /> Imbalanced</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          <div className="space-y-4">
            {/* Floor utilization */}
            <FloorUtilization trailer={trailer} placedPallets={placedPallets} />

            {/* Total weight */}
            <div className="text-center py-2 bg-muted/20 rounded-lg border border-border">
              <p className="text-2xl font-bold">{dist.totalWeight.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total lbs / {trailer.max_weight.toLocaleString()} max</p>
            </div>

            {/* Front / Rear axle bars */}
            <div className="space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <ArrowUp className="h-3 w-3" /> Front / Rear Axle
              </p>
              <AxleBar
                leftLabel="Front (Cab)"
                rightLabel="Rear (Door)"
                leftPercent={dist.frontAxlePercent}
                rightPercent={dist.rearAxlePercent}
                leftWeight={dist.frontAxleLoad}
                rightWeight={dist.rearAxleLoad}
                danger={dist.frontAxlePercent > 65 || dist.rearAxlePercent > 65}
              />
            </div>

            {/* Left / Right balance */}
            <div className="space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <ArrowLeft className="h-3 w-3" /> Left / Right Balance
              </p>
              <AxleBar
                leftLabel="Left"
                rightLabel="Right"
                leftPercent={dist.leftSidePercent}
                rightPercent={dist.rightSidePercent}
                leftWeight={dist.leftSideLoad}
                rightWeight={dist.rightSideLoad}
                danger={Math.abs(dist.leftSidePercent - dist.rightSidePercent) > 30}
              />
            </div>

            {/* Zone weight breakdown */}
            <div className="space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <Layers className="h-3 w-3" /> Weight by Zone
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {TRAILER_ZONES.map(zone => {
                  const zoneWeight = placedPallets.reduce((sum, p) => {
                    const dims = p.palletData.pallet_data.palletDimensions;
                    const loadH = p.rotation === 90 ? dims.width : dims.length;
                    const pZone = getLoadZone(p.y, loadH, trailer.length);
                    if (pZone.id !== zone.id) return sum;
                    return sum + p.palletData.pallet_data.placedCases.reduce((s, c) => s + (c.weight || 0), 0);
                  }, 0);
                  const pct = dist.totalWeight > 0 ? (zoneWeight / dist.totalWeight) * 100 : 0;
                  return (
                    <div key={zone.id} className="rounded-md border border-border/50 p-2 text-center"
                      style={{ backgroundColor: zone.bg }}>
                      <p className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: zone.text }}>{zone.shortLabel}</p>
                      <p className="text-xs font-bold mt-0.5">{zoneWeight.toLocaleString()}lb</p>
                      <p className="text-[9px] text-muted-foreground">{pct.toFixed(0)}%</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* COG heatmap */}
            <div className="space-y-2">
              <p className="text-xs font-semibold">Center of Gravity</p>
              <div className="relative w-full aspect-[2/3] max-h-[120px] bg-muted/20 rounded-lg border border-border overflow-hidden">
                {/* Zone grid */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-3">
                  {dist.zones.map((z, i) => (
                    <div key={i} className="border border-border/30 flex flex-col items-center justify-center p-0.5"
                      style={{
                        backgroundColor: z.percent > 25
                          ? `hsl(0 70% 50% / ${Math.min(0.3, z.percent / 100)})`
                          : z.percent > 10
                            ? `hsl(45 80% 50% / ${Math.min(0.25, z.percent / 80)})`
                            : "transparent"
                      }}>
                      <span className="text-[9px] font-bold">{z.percent.toFixed(0)}%</span>
                      <span className="text-[8px] text-muted-foreground">{z.weight > 0 ? `${z.weight.toLocaleString()}lb` : "—"}</span>
                    </div>
                  ))}
                </div>
                {/* COG dot */}
                <div
                  className={cn(
                    "absolute w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-background shadow-lg z-10",
                    dist.isBalanced ? "bg-emerald-500" : "bg-destructive"
                  )}
                  style={{ left: `${dist.cogX * 100}%`, top: `${dist.cogY * 100}%` }}
                >
                  <div className={cn(
                    "absolute inset-0 rounded-full animate-ping opacity-30",
                    dist.isBalanced ? "bg-emerald-500" : "bg-destructive"
                  )} />
                </div>
                {/* Labels */}
                <div className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground font-medium pointer-events-none">CAB</div>
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground font-medium pointer-events-none">DOOR</div>
              </div>
            </div>

            {/* Warnings */}
            {dist.warnings.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Safety Alerts ({dist.warnings.length})
                  </p>
                  {dist.warnings.map(w => (
                    <WarningCard key={w.id} warning={w} />
                  ))}
                </div>
              </>
            )}

            {dist.warnings.length === 0 && (
              <>
                <Separator />
                <div className="flex items-center gap-2 py-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <p className="text-xs text-muted-foreground">Weight distribution looks safe.</p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// --- Sub-components ---

function AxleBar({ leftLabel, rightLabel, leftPercent, rightPercent, leftWeight, rightWeight, danger }: {
  leftLabel: string; rightLabel: string;
  leftPercent: number; rightPercent: number;
  leftWeight: number; rightWeight: number;
  danger: boolean;
}) {
  const leftColor = danger && leftPercent > 55 ? "bg-destructive" : leftPercent > 55 ? "bg-amber-500" : "bg-emerald-500";
  const rightColor = danger && rightPercent > 55 ? "bg-destructive" : rightPercent > 55 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-2.5 space-y-1.5">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-muted/30">
        <div className={cn("h-full transition-all duration-500 rounded-l-full", leftColor)}
          style={{ width: `${leftPercent}%` }} />
        <div className={cn("h-full transition-all duration-500 rounded-r-full", rightColor)}
          style={{ width: `${rightPercent}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="font-semibold">{leftPercent.toFixed(1)}%</span>
        <span className="text-[10px] text-muted-foreground">{leftWeight.toLocaleString()}lb | {rightWeight.toLocaleString()}lb</span>
        <span className="font-semibold">{rightPercent.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function WarningCard({ warning }: { warning: WeightWarning }) {
  const config = severityConfig[warning.severity];
  const Icon = config.icon;

  return (
    <div className={cn("rounded-lg border p-2.5 space-y-0.5", config.bg, config.border)}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", config.color)} />
        <p className={cn("text-xs font-semibold", config.color)}>{warning.title}</p>
      </div>
      <p className="text-[10px] text-muted-foreground pl-5.5 leading-relaxed">{warning.description}</p>
    </div>
  );
}

function FloorUtilization({ trailer, placedPallets }: { trailer: CustomTrailer; placedPallets: PlacedPallet[] }) {
  const utilization = useMemo(() => {
    if (placedPallets.length === 0) return 0;
    const totalFloor = trailer.width * trailer.length;
    const usedFloor = placedPallets.reduce((sum, p) => {
      const d = p.palletData.pallet_data.palletDimensions;
      const w = p.rotation === 90 ? d.length : d.width;
      const h = p.rotation === 90 ? d.width : d.length;
      return sum + w * h;
    }, 0);
    return Math.min(100, Math.round((usedFloor / totalFloor) * 100));
  }, [trailer, placedPallets]);

  const color = utilization >= 80 ? "text-emerald-500" : utilization >= 50 ? "text-primary" : "text-muted-foreground";

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">Floor Utilization</p>
        <span className={cn("text-lg font-bold tabular-nums", color)}>{utilization}%</span>
      </div>
      <Progress value={utilization} className="h-1.5" />
      <p className="text-[10px] text-muted-foreground">
        {placedPallets.length} load{placedPallets.length !== 1 ? "s" : ""} placed
      </p>
    </div>
  );
}
