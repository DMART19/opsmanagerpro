import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CapacityBar } from "@/components/ui/capacity-bar";
import { ChevronDown, Gauge, AlertTriangle, CheckCircle2, Zap, Sparkles } from "lucide-react";
import { CustomTrailer } from "@/hooks/use-custom-trailers";
import { PlacedPallet } from "@/types/trailer-builder";
import { TrailerLoadScore } from "@/lib/trailer-load-score";
import { TrailerSpecsPanel } from "./TrailerSpecsPanel";
import { WeightDistributionPanel } from "./WeightDistributionPanel";
import { LoadIntelligencePanel } from "./LoadIntelligencePanel";
import { cn } from "@/lib/utils";

interface Props {
  trailer: CustomTrailer | null;
  placedPallets: PlacedPallet[];
  score: TrailerLoadScore | null;
  selectedPalletId: string | null;
  onSelectPallet: (id: string | null) => void;
  onRotatePallet: (id: string) => void;
  onDuplicatePallet: (id: string) => void;
  onRemovePallet: (id: string) => void;
  onApplyRecommendation: (palletId: string, updates: Partial<PlacedPallet>) => void;
  onBulkUpdate: (updates: { palletId: string; updates: Partial<PlacedPallet> }[]) => void;
  onOptimize?: () => void;
}

/**
 * Consolidated trailer-side intelligence card.
 * Surfaces Load Score, fill, weight, balance, warnings and one top suggestion.
 * Hides legacy Specs/Weight/Intelligence panels behind a Details disclosure.
 */
export const LoadStatusPanel = ({
  trailer,
  placedPallets,
  score,
  selectedPalletId,
  onSelectPallet,
  onRotatePallet,
  onDuplicatePallet,
  onRemovePallet,
  onApplyRecommendation,
  onBulkUpdate,
  onOptimize,
}: Props) => {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const scoreTone =
    !score || placedPallets.length === 0
      ? "muted"
      : score.criticalWarnings > 0
      ? "danger"
      : score.score >= 80
      ? "ok"
      : "warn";

  return (
    <div className="flex flex-col gap-3 min-h-0">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Load Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ready to Ship — primary status */}
          <div
            className={cn(
              "rounded-xl border-2 p-3 text-center",
              scoreTone === "ok" && "border-primary/40 bg-primary/10",
              scoreTone === "warn" && "border-warning/40 bg-warning/10",
              scoreTone === "danger" && "border-destructive/40 bg-destructive/10",
              scoreTone === "muted" && "border-border bg-muted/30"
            )}
          >
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Ready to Ship
            </p>
            <p
              className={cn(
                "text-3xl font-bold leading-none mt-1",
                scoreTone === "ok" && "text-primary",
                scoreTone === "warn" && "text-warning",
                scoreTone === "danger" && "text-destructive",
                scoreTone === "muted" && "text-muted-foreground"
              )}
            >
              {score?.validated ? "YES" : "NO"}
            </p>
            {score && placedPallets.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Load Score: <span className="font-semibold tabular-nums text-foreground">{score.score}</span>/100
                {score.warnings > 0 && (
                  <> · <span className="text-warning">{score.warnings} issue{score.warnings === 1 ? "" : "s"}</span></>
                )}
              </p>
            )}
            {(!score || placedPallets.length === 0) && (
              <p className="text-[11px] text-muted-foreground mt-2">
                {placedPallets.length === 0 ? "Place pallets to validate" : "—"}
              </p>
            )}
          </div>

          {/* Bars */}
          {trailer && (
            <div className="space-y-3">
              <CapacityBar
                label="Weight"
                value={score?.totalWeight || 0}
                max={trailer.max_weight}
                unit="lbs"
              />
              <CapacityBar
                label="Trailer Fill"
                value={score?.fillPct || 0}
                max={100}
                unit="%"
                compact
              />
            </div>
          )}

          {/* Status row */}
          {trailer && placedPallets.length > 0 && score && (
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
                <p className="text-muted-foreground">Distribution</p>
                <p
                  className={cn(
                    "font-semibold",
                    score.balanceOk ? "text-primary" : "text-warning"
                  )}
                >
                  {score.balanceLabel}
                </p>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
                <p className="text-muted-foreground">Warnings</p>
                <p
                  className={cn(
                    "font-semibold",
                    score.warnings === 0
                      ? "text-muted-foreground"
                      : score.criticalWarnings > 0
                      ? "text-destructive"
                      : "text-warning"
                  )}
                >
                  {score.warnings}
                </p>
              </div>
            </div>
          )}

          {/* Top suggestion */}
          {score?.topSuggestion && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-2">
              <div className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed">{score.topSuggestion}</p>
              </div>
              {onOptimize && (
                <Button size="sm" className="w-full h-7 text-xs gap-1.5" onClick={onOptimize}>
                  <Zap className="h-3 w-3" /> Optimize Load
                </Button>
              )}
            </div>
          )}

          {score?.criticalWarnings && score.criticalWarnings > 0 ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
              <p className="text-[11px] text-destructive">
                {score.criticalWarnings} critical issue{score.criticalWarnings > 1 ? "s" : ""} block shipment.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Power-user details */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border/60 bg-card hover:bg-muted/40 transition-colors text-xs font-medium"
          >
            <span>Details</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                detailsOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <TrailerSpecsPanel
            trailer={trailer}
            placedPallets={placedPallets}
            selectedPalletId={selectedPalletId}
            onSelectPallet={onSelectPallet}
            onRotatePallet={onRotatePallet}
            onDuplicatePallet={onDuplicatePallet}
            onRemovePallet={onRemovePallet}
          />
          <WeightDistributionPanel trailer={trailer} placedPallets={placedPallets} />
          <LoadIntelligencePanel
            trailer={trailer}
            placedPallets={placedPallets}
            onApplyRecommendation={onApplyRecommendation}
            onBulkUpdate={onBulkUpdate}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};