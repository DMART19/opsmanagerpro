import { Package, Weight, Layers, BarChart3, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlacedCase } from "@/types/pallet-builder";
import { PalletConfig } from "@/pages/PalletBuilder";
import { useMemo } from "react";

interface PalletStatsPanelProps {
  selectedPallet: PalletConfig | null;
  placedCases: PlacedCase[];
  metrics: {
    totalWeight: number;
    maxWeight: number;
    weightUsage: number;
    itemCount: number;
    layers: number;
  };
}

export const PalletStatsPanel = ({
  selectedPallet,
  placedCases,
  metrics,
}: PalletStatsPanelProps) => {
  const utilizationPercent = useMemo(() => {
    if (!selectedPallet || placedCases.length === 0) return 0;
    const palletArea = selectedPallet.width * selectedPallet.length;
    const usedArea = placedCases.reduce((sum, c) => {
      const w = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
      const l = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
      return sum + w * l;
    }, 0);
    return Math.min(100, Math.round((usedArea / palletArea) * 100));
  }, [selectedPallet, placedCases]);

  const fragileCount = placedCases.filter(c => c.fragile).length;

  if (!selectedPallet) return null;

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-background border-l border-border/40">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/30">
        <h3 className="text-sm font-semibold text-foreground">Build Summary</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">{selectedPallet.name}</p>
      </div>

      <div className="px-5 py-4 space-y-5 flex-1">
        {/* Pallet Info */}
        <div className="space-y-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Pallet</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-muted-foreground">Dimensions</p>
              <p className="text-sm font-semibold tabular-nums">{selectedPallet.width}" × {selectedPallet.length}"</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Max Weight</p>
              <p className="text-sm font-semibold tabular-nums">{selectedPallet.maxWeight.toLocaleString()} lbs</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-border/30" />

        {/* Items on Pallet */}
        <div className="space-y-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Placed Items</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-foreground">{metrics.itemCount}</span>
            <span className="text-xs text-muted-foreground">items</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              <span>{metrics.layers || 1} layer{metrics.layers !== 1 ? 's' : ''}</span>
            </div>
            {fragileCount > 0 && (
              <div className="flex items-center gap-1 text-warning">
                <AlertTriangle className="h-3 w-3" />
                <span>{fragileCount} fragile</span>
              </div>
            )}
          </div>
        </div>

        <div className="h-px bg-border/30" />

        {/* Weight */}
        <div className="space-y-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Weight</p>
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-2xl font-bold tabular-nums",
              metrics.weightUsage > 100 ? "text-destructive" :
              metrics.weightUsage > 80 ? "text-warning" :
              "text-foreground"
            )}>
              {metrics.totalWeight.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">/ {metrics.maxWeight.toLocaleString()} lbs</span>
          </div>
          {/* Weight bar */}
          <div className="space-y-1">
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  metrics.weightUsage > 100 ? "bg-destructive" :
                  metrics.weightUsage > 80 ? "bg-warning" :
                  "bg-primary"
                )}
                style={{ width: `${Math.min(100, metrics.weightUsage)}%` }}
              />
            </div>
            <p className={cn(
              "text-[11px] font-medium tabular-nums",
              metrics.weightUsage > 100 ? "text-destructive" :
              metrics.weightUsage > 80 ? "text-warning" :
              "text-muted-foreground"
            )}>
              {metrics.weightUsage}% capacity
            </p>
          </div>
        </div>

        <div className="h-px bg-border/30" />

        {/* Area Utilization */}
        <div className="space-y-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Area Utilization</p>
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-2xl font-bold tabular-nums",
              utilizationPercent > 95 ? "text-destructive" :
              utilizationPercent > 75 ? "text-warning" :
              "text-foreground"
            )}>{utilizationPercent}%</span>
            <span className="text-xs text-muted-foreground">surface coverage</span>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  utilizationPercent > 95 ? "bg-destructive" :
                  utilizationPercent > 75 ? "bg-warning" :
                  "bg-primary"
                )}
                style={{ width: `${utilizationPercent}%` }}
              />
            </div>
            <p className={cn(
              "text-[11px] font-medium tabular-nums",
              utilizationPercent > 95 ? "text-destructive" :
              utilizationPercent > 75 ? "text-warning" :
              "text-muted-foreground"
            )}>
              {utilizationPercent <= 50 ? "Plenty of space" :
               utilizationPercent <= 75 ? "Good coverage" :
               utilizationPercent <= 95 ? "Near capacity" :
               "Fully packed"}
            </p>
          </div>
        </div>

        {/* Warnings */}
        {metrics.weightUsage > 100 && (
          <>
            <div className="h-px bg-border/30" />
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <p className="text-xs font-medium">Weight limit exceeded</p>
              </div>
              <p className="text-[11px] text-destructive/70 mt-1">
                Remove items or switch to a higher-capacity pallet.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
