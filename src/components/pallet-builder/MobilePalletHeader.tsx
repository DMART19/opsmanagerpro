import { CheckCircle2, AlertTriangle, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  palletName?: string | null;
  dimsLabel?: string | null;
  itemCount: number;
  totalWeight: number;
  weightOk: boolean;
  warnings: number;
  /** Sticky top offset in px (height of the workflow stepper above). Defaults to 0. */
  stickyTopPx?: number;
}

/**
 * Compact sticky mini-header for the mobile Build Pallets step.
 * Two short lines that always tell the user what pallet they're on,
 * how many items, current weight, and validation state.
 * Mobile-only — wrapped in `lg:hidden` by parent.
 */
export const MobilePalletHeader = ({
  palletName,
  dimsLabel,
  itemCount,
  totalWeight,
  weightOk,
  warnings,
  stickyTopPx = 0,
}: Props) => {
  const status = itemCount === 0
    ? { label: "Empty", tone: "muted" as const, Icon: Package }
    : !weightOk
    ? { label: "Over weight", tone: "danger" as const, Icon: AlertTriangle }
    : warnings > 0
    ? { label: "Warnings", tone: "warn" as const, Icon: AlertTriangle }
    : { label: "Ready", tone: "ok" as const, Icon: CheckCircle2 };

  const toneClass: Record<string, string> = {
    muted: "bg-muted/60 text-muted-foreground border-border/50",
    danger: "bg-destructive/10 text-destructive border-destructive/30",
    warn: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    ok: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  };

  return (
    <div
      className="lg:hidden sticky z-20 bg-background/95 backdrop-blur border-b border-border/60"
      style={{ top: stickyTopPx }}
    >
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            <span>Build Pallets</span>
          </div>
          <div className="text-[12px] text-foreground/90 truncate tabular-nums">
            {palletName ? (
              <>
                <span className="font-medium">{dimsLabel || palletName}</span>
                <span className="opacity-40 mx-1.5">·</span>
                <span>{itemCount} item{itemCount === 1 ? "" : "s"}</span>
                <span className="opacity-40 mx-1.5">·</span>
                <span>{Math.round(totalWeight).toLocaleString()} lbs</span>
              </>
            ) : (
              <span className="text-muted-foreground">No pallet selected</span>
            )}
          </div>
        </div>
        <div
          className={cn(
            "shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-full border text-[11px] font-medium",
            toneClass[status.tone]
          )}
        >
          <status.Icon className="h-3.5 w-3.5" />
          {status.label}
        </div>
      </div>
    </div>
  );
};