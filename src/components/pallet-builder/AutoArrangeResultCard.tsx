import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AutoArrangeImpact {
  quality: number; // 0..100
  utilizationBefore: number;
  utilizationAfter: number;
  balanceImprovementPct: number;
  heightReductionInches: number;
  conflictsResolved: number;
  itemsPlaced: number;
}

interface Props {
  impact: AutoArrangeImpact;
  onKeep: () => void;
  onUndo: () => void;
  onDismiss: () => void;
}

/**
 * Transparency card shown after Auto Arrange. Explains *why* the automation
 * chose this layout so operators learn to trust it.
 */
export const AutoArrangeResultCard = ({ impact, onKeep, onUndo, onDismiss }: Props) => {
  const lines: string[] = [];
  if (impact.itemsPlaced > 0) lines.push(`Placed ${impact.itemsPlaced} item${impact.itemsPlaced === 1 ? "" : "s"}`);
  if (impact.utilizationAfter > impact.utilizationBefore) {
    lines.push(`Utilization improved ${impact.utilizationAfter - impact.utilizationBefore}% (${impact.utilizationBefore}% → ${impact.utilizationAfter}%)`);
  }
  if (impact.balanceImprovementPct > 0) {
    lines.push(`Weight balance improved ${impact.balanceImprovementPct}%`);
  }
  if (impact.heightReductionInches > 0) {
    lines.push(`Reduced pallet height by ${impact.heightReductionInches}"`);
  }
  if (impact.conflictsResolved > 0) {
    lines.push(`Eliminated ${impact.conflictsResolved} placement conflict${impact.conflictsResolved === 1 ? "" : "s"}`);
  }

  return (
    <div className="rounded-xl border border-success/40 bg-success/5 p-3 shadow-md backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-success shrink-0" />
          <div>
            <p className="text-sm font-semibold leading-tight">Auto Arrange Complete</p>
            <p className="text-[11px] text-muted-foreground">Quality {impact.quality}%</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <ul className="mt-2 space-y-0.5">
        {lines.map((line, i) => (
          <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
            <span className="text-success mt-0.5">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex gap-1.5">
        <Button size="sm" onClick={onKeep} className="flex-1 h-7 text-xs">Keep</Button>
        <Button size="sm" variant="outline" onClick={onUndo} className="flex-1 h-7 text-xs">Undo</Button>
      </div>
    </div>
  );
};