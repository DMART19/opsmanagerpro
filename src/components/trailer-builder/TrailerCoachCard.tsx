import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, CheckCircle2, Truck, Plus, Wand2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export type CoachState = "no-trailer" | "no-pallets-built" | "no-pallets" | "needs-attention" | "ready";

interface Props {
  state: CoachState;
  onSelectTrailer?: () => void;
  onCreateTrailer?: () => void;
  onBuildPallets?: () => void;
  onLoadSuggested?: () => void;
  onOptimize?: () => void;
  onOpenReview?: () => void;
  className?: string;
  /** Counters surfaced inline on the slim strip. */
  ready?: number;
  loaded?: number;
  remaining?: number;
}

const COPY: Record<CoachState, { title: string; icon: any }> = {
  "no-trailer": {
    title: "Select a vehicle to begin loading",
    icon: Truck,
  },
  "no-pallets-built": {
    title: "Build pallets before creating a load",
    icon: Layers,
  },
  "no-pallets": {
    title: "Load pallets into the vehicle",
    icon: Wand2,
  },
  "needs-attention": {
    title: "Review weight balance and optimize",
    icon: Sparkles,
  },
  ready: {
    title: "Ready for review",
    icon: CheckCircle2,
  },
};

export const TrailerCoachCard = ({
  state,
  onSelectTrailer,
  onCreateTrailer,
  onBuildPallets,
  onLoadSuggested,
  onOptimize,
  onOpenReview,
  className,
  ready = 0,
  loaded = 0,
  remaining = 0,
}: Props) => {
  const c = COPY[state];
  const Icon = c.icon;
  const accent =
    state === "ready"
      ? "text-primary"
      : state === "needs-attention"
      ? "text-warning"
      : "text-primary";

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/80 shadow-sm px-4 h-[60px] flex items-center gap-4 backdrop-blur",
        className
      )}
    >
      <div className={cn("h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0", accent)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex items-center gap-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Next</p>
        <p className="text-sm font-medium leading-tight truncate">{c.title}</p>
      </div>
      <div className="hidden md:flex items-center gap-4 ml-2 text-[11px] text-muted-foreground tabular-nums">
        <span><span className="font-semibold text-foreground">{ready}</span> ready</span>
        <span className="text-muted-foreground/30">·</span>
        <span><span className="font-semibold text-foreground">{loaded}</span> loaded</span>
        <span className="text-muted-foreground/30">·</span>
        <span><span className="font-semibold text-foreground">{remaining}</span> remaining</span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2 shrink-0">
        {state === "no-trailer" && onSelectTrailer && (
          <>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onSelectTrailer}>
              <Truck className="h-3.5 w-3.5" /> Select Vehicle
            </Button>
            {onCreateTrailer && (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onCreateTrailer}>
                <Plus className="h-3.5 w-3.5" /> Create Vehicle
              </Button>
            )}
          </>
        )}
        {state === "no-pallets-built" && onBuildPallets && (
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onBuildPallets}>
            <Layers className="h-3.5 w-3.5" /> Open Pallet Builder
          </Button>
        )}
        {state === "no-pallets" && onLoadSuggested && (
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onLoadSuggested}>
            <Wand2 className="h-3.5 w-3.5" /> Auto Load Vehicle
          </Button>
        )}
        {state === "needs-attention" && onOptimize && (
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onOptimize}>
            <Sparkles className="h-3.5 w-3.5" /> Optimize Load
          </Button>
        )}
        {state === "ready" && onOpenReview && (
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onOpenReview}>
            Continue to Ready To Ship <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};