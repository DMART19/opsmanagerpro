import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Wand2, Check, X, RotateCw, Package, Scale, Maximize2, AlertTriangle, Loader2, Sparkles,
  Truck, ChevronDown
} from "lucide-react";
import { SavedPalletBuild } from "@/hooks/use-saved-pallet-builds";
import { CustomTrailer } from "@/hooks/use-custom-trailers";
import { PlacedPallet } from "@/types/trailer-builder";
import { autoPackTrailer, AutoPackResult } from "@/lib/trailer-auto-pack";
import { cn } from "@/lib/utils";

interface AutoPackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trailer: CustomTrailer;
  availablePallets: SavedPalletBuild[];
  existingPallets: PlacedPallet[];
  onAccept: (pallets: PlacedPallet[]) => void;
}

type Phase = "config" | "packing" | "result";

export const AutoPackModal = ({
  open, onOpenChange, trailer, availablePallets, existingPallets, onAccept,
}: AutoPackModalProps) => {
  const [phase, setPhase] = useState<Phase>("config");
  const [progress, setProgress] = useState(0);
  const [packingStep, setPackingStep] = useState(0);
  const [result, setResult] = useState<AutoPackResult | null>(null);

  // Config
  const [allowRotation, setAllowRotation] = useState(true);
  const [balanceWeight, setBalanceWeight] = useState(true);
  const [clearExisting, setClearExisting] = useState(true);
  const [selectedPallets, setSelectedPallets] = useState<Set<string>>(new Set());

  // Initialize selected pallets when opened
  useEffect(() => {
    if (open) {
      setPhase("config");
      setResult(null);
      setProgress(0);
      setSelectedPallets(new Set(availablePallets.map(p => p.id)));
    }
  }, [open, availablePallets]);

  const togglePallet = (id: string) => {
    setSelectedPallets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const runAutoPack = useCallback(async () => {
    setPhase("packing");
    setProgress(0);
    setPackingStep(0);

    const palletsToPlace = availablePallets.filter(p => selectedPallets.has(p.id));
    const existing = clearExisting ? [] : existingPallets;

    // Simulate progress with step messages for UX
    const steps = [
      { at: 0, step: 0 },    // "Optimizing layout..."
      { at: 25, step: 1 },   // "Analyzing X loads"
      { at: 60, step: 2 },   // "Calculating best placement"
    ];

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(prev + Math.random() * 12, 85);
        const activeStep = [...steps].reverse().find(s => next >= s.at);
        if (activeStep) setPackingStep(activeStep.step);
        return next;
      });
    }, 140);

    // Run pack in next tick to allow UI to update
    await new Promise(r => setTimeout(r, 100));

    const packResult = autoPackTrailer(trailer, palletsToPlace, existing, {
      allowRotation,
      balanceWeight,
      snapIncrement: 6,
    });

    clearInterval(progressInterval);
    setProgress(100);
    setPackingStep(3);

    await new Promise(r => setTimeout(r, 400));
    setResult(packResult);
    setPhase("result");
  }, [trailer, availablePallets, existingPallets, selectedPallets, allowRotation, balanceWeight, clearExisting]);

  const handleAccept = () => {
    if (result) {
      onAccept(result.placed);
      onOpenChange(false);
    }
  };

  const handleRerun = () => {
    setPhase("config");
    setResult(null);
    setProgress(0);
  };

  // Derived: total weight of selected pallets for summary card
  const selectedPalletObjs = availablePallets.filter(p => selectedPallets.has(p.id));
  const selectedWeight = selectedPalletObjs.reduce(
    (s, p) => s + p.pallet_data.placedCases.reduce((w, c) => w + (c.weight || 0), 0),
    0
  );
  const singlePallet = availablePallets.length === 1;
  const hasExisting = existingPallets.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Auto Pack Trailer
          </DialogTitle>
          <DialogDescription>
            {phase === "config" && "Recommended settings will pack your trailer for you."}
            {phase === "packing" && "Calculating optimal load layout…"}
            {phase === "result" && "Packing complete. Review the results below."}
          </DialogDescription>
        </DialogHeader>

        {/* Config Phase */}
        {phase === "config" && (
          <div className="flex-1 overflow-auto space-y-4 py-2">
            {availablePallets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
                <Package className="h-6 w-6 text-muted-foreground/60 mx-auto mb-2" />
                <p className="text-sm font-medium">No pallets in library</p>
                <p className="text-xs text-muted-foreground mt-1">Save pallets in the Pallet Builder first.</p>
              </div>
            ) : (
              <>
                {/* "Here's the plan" summary card */}
                <div className="rounded-xl border border-primary/20 bg-card shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/50 bg-primary/[0.03]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Here's the plan</p>
                  </div>
                  <div className="px-4 py-3 space-y-2.5">
                    <SummaryRow
                      icon={<Truck className="h-4 w-4 text-muted-foreground" />}
                      primary={trailer.name}
                      secondary={`${trailer.width}" × ${trailer.length}" · Max ${trailer.max_weight.toLocaleString()} lb`}
                    />
                    <SummaryRow
                      icon={<Package className="h-4 w-4 text-muted-foreground" />}
                      primary={
                        singlePallet
                          ? availablePallets[0].name
                          : `${selectedPallets.size} of ${availablePallets.length} pallets selected`
                      }
                      secondary={`${selectedWeight.toLocaleString()} lb total`}
                    />
                    <SummaryRow
                      icon={<Sparkles className="h-4 w-4 text-amber-500" />}
                      primary="Auto-arranged for best fit & weight balance"
                      secondary={hasExisting && !clearExisting ? "Keeping existing layout" : undefined}
                    />
                  </div>
                </div>

                {/* Primary CTA */}
                <div className="space-y-1.5">
                  <Button
                    onClick={runAutoPack}
                    disabled={selectedPallets.size === 0}
                    className="w-full h-11 text-sm font-semibold gap-2"
                  >
                    <Wand2 className="h-4 w-4" />
                    Pack Trailer
                  </Button>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5"
                  >
                    Cancel
                  </button>
                </div>

                {/* Advanced options */}
                <Collapsible>
                  <CollapsibleTrigger className="group w-full flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1.5">
                    Advanced options
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden">
                    <div className="space-y-4 pt-3 mt-1 border-t border-border/50">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="auto-rotation" className="text-sm flex items-center gap-2 cursor-pointer">
                            <RotateCw className="h-3.5 w-3.5 text-muted-foreground" /> Allow rotation
                          </Label>
                          <Switch id="auto-rotation" checked={allowRotation} onCheckedChange={setAllowRotation} />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="auto-balance" className="text-sm flex items-center gap-2 cursor-pointer">
                            <Scale className="h-3.5 w-3.5 text-muted-foreground" /> Balance weight
                          </Label>
                          <Switch id="auto-balance" checked={balanceWeight} onCheckedChange={setBalanceWeight} />
                        </div>
                        {hasExisting && (
                          <div className="flex items-center justify-between">
                            <Label htmlFor="auto-clear" className="text-sm flex items-center gap-2 cursor-pointer">
                              <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" /> Clear existing layout
                            </Label>
                            <Switch id="auto-clear" checked={clearExisting} onCheckedChange={setClearExisting} />
                          </div>
                        )}
                      </div>

                      {!singlePallet && (
                        <>
                          <Separator />
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold">Pallets to Pack ({selectedPallets.size}/{availablePallets.length})</p>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px]"
                                onClick={() => {
                                  if (selectedPallets.size === availablePallets.length) setSelectedPallets(new Set());
                                  else setSelectedPallets(new Set(availablePallets.map(p => p.id)));
                                }}>
                                {selectedPallets.size === availablePallets.length ? "Deselect all" : "Select all"}
                              </Button>
                            </div>
                            <div className="space-y-1.5 max-h-[200px] overflow-auto">
                              {availablePallets.map(p => {
                                const w = p.pallet_data.placedCases.reduce((s, c) => s + (c.weight || 0), 0);
                                const d = p.pallet_data.palletDimensions;
                                const selected = selectedPallets.has(p.id);
                                return (
                                  <button
                                    key={p.id}
                                    onClick={() => togglePallet(p.id)}
                                    className={cn(
                                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors text-xs",
                                      selected
                                        ? "bg-primary/5 border-primary/30"
                                        : "bg-background border-border hover:bg-muted/30 opacity-60"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                                      selected ? "bg-primary border-primary" : "border-muted-foreground/40"
                                    )}>
                                      {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                                    </div>
                                    <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="font-medium truncate flex-1">{p.name}</span>
                                    <span className="text-muted-foreground shrink-0">{d.width}"×{d.length}"</span>
                                    <Badge variant="secondary" className="text-[9px] shrink-0">{w}lb</Badge>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </div>
        )}

        {/* Packing Phase */}
        {phase === "packing" && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-6 animate-fade-in">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Wand2 className="h-8 w-8 text-primary animate-[spin_3s_linear_infinite]" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-amber-500 animate-pulse" />
            </div>
            <div className="text-center space-y-3 max-w-xs">
              <p className="text-sm font-semibold">Optimizing layout…</p>
              <div className="space-y-1">
                {[
                  `Analyzing ${selectedPallets.size} load${selectedPallets.size !== 1 ? "s" : ""}`,
                  "Calculating best placement",
                  "Finalizing positions",
                ].map((msg, i) => (
                  <p key={i} className={cn(
                    "text-xs transition-all duration-300",
                    i <= packingStep ? "text-foreground/70 opacity-100" : "text-muted-foreground/30 opacity-50",
                    i === packingStep && "font-medium text-foreground/90"
                  )}>
                    {i < packingStep ? "✓" : i === packingStep ? "›" : "·"} {msg}
                  </p>
                ))}
              </div>
            </div>
            <div className="w-full max-w-xs space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-[10px] text-muted-foreground text-center tabular-nums">{Math.round(progress)}%</p>
            </div>
          </div>
        )}

        {/* Result Phase */}
        {phase === "result" && result && (
          <div className="flex-1 overflow-auto space-y-4 py-2">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2">
              <ResultCard
                icon={<Package className="h-4 w-4 text-primary" />}
                label="Placed"
                value={`${result.totalPlaced}`}
                sub={`of ${result.totalPlaced + result.totalSkipped}`}
                delay={0}
              />
              <ResultCard
                icon={<Maximize2 className="h-4 w-4 text-emerald-500" />}
                label="Floor Used"
                value={`${result.floorUtilization}%`}
                sub={result.floorUtilization >= 75 ? "Great" : result.floorUtilization >= 50 ? "Good" : "Low"}
                delay={1}
              />
              <ResultCard
                icon={<Scale className="h-4 w-4 text-amber-500" />}
                label="Weight"
                value={`${result.totalWeight.toLocaleString()}`}
                sub={`of ${trailer.max_weight.toLocaleString()} lb`}
                delay={2}
              />
            </div>

            {/* Utilization bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Floor Utilization</span>
                <span className="text-xs font-semibold">{result.floorUtilization}%</span>
              </div>
              <Progress value={result.floorUtilization} className="h-2.5" />
            </div>

            {/* Weight check */}
            {result.totalWeight > trailer.max_weight && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive font-medium">
                  Weight exceeds limit by {(result.totalWeight - trailer.max_weight).toLocaleString()} lbs
                </p>
              </div>
            )}

            {/* Skipped */}
            {result.totalSkipped > 0 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 space-y-1">
                <p className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {result.totalSkipped} pallet{result.totalSkipped > 1 ? "s" : ""} couldn't fit
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {result.skippedNames.join(", ")}
                </p>
              </div>
            )}

            {/* Remaining space */}
            <div className="text-xs text-muted-foreground">
              Remaining space: {result.remainingSpace.toLocaleString()} sq in
            </div>
          </div>
        )}

        {/* Footer actions */}
        <DialogFooter className="gap-2">
          {phase === "config" && availablePallets.length === 0 && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          )}
          {phase === "result" && (
            <>
              <Button variant="outline" onClick={handleRerun}>
                <RotateCw className="h-4 w-4 mr-1.5" /> Rerun
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4 mr-1.5" /> Discard
              </Button>
              <Button onClick={handleAccept}>
                <Check className="h-4 w-4 mr-1.5" /> Accept Layout
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function SummaryRow({ icon, primary, secondary }: { icon: React.ReactNode; primary: string; secondary?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight truncate">{primary}</p>
        {secondary && <p className="text-xs text-muted-foreground mt-0.5 truncate">{secondary}</p>}
      </div>
    </div>
  );
}

function ResultCard({ icon, label, value, sub, delay = 0 }: {
  icon: React.ReactNode; label: string; value: string; sub: string; delay?: number;
}) {
  return (
    <div
      className="rounded-lg border border-border bg-muted/20 p-3 text-center space-y-1 animate-scale-in"
      style={{ animationDelay: `${delay * 80}ms`, animationFillMode: "both" }}
    >
      <div className="flex justify-center">{icon}</div>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-[9px] text-muted-foreground">{sub}</p>
    </div>
  );
}
