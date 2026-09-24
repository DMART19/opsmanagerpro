import { Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SuggestedPlacement } from "@/lib/pallet-suggest-placement";
import { PalletLibraryItem } from "@/types/pallet-builder";

interface Props {
  item: PalletLibraryItem;
  suggestion: SuggestedPlacement | null;
  onPlace: () => void;
  onDismiss: () => void;
}

/**
 * Proactive recommendation card. Visible whenever an inventory item is selected
 * and has known dimensions. One-click "Place Automatically" routes through the
 * same placement pipeline as drag-drop.
 */
export const SuggestedPlacementPanel = ({ item, suggestion, onPlace, onDismiss }: Props) => {
  const tone =
    !suggestion ? "border-muted bg-muted/30"
    : suggestion.confidence >= 85 ? "border-success/40 bg-success/5"
    : suggestion.confidence >= 60 ? "border-warning/40 bg-warning/5"
    : "border-destructive/40 bg-destructive/5";

  return (
    <div className={cn("rounded-xl border p-3 shadow-sm backdrop-blur", tone)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Target className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
              Suggested placement
            </p>
            <p className="text-sm font-semibold truncate">{item.name}</p>
          </div>
        </div>
        {suggestion && (
          <span className="text-xs font-semibold tabular-nums text-primary shrink-0">
            {suggestion.confidence}%
          </span>
        )}
      </div>

      {!suggestion ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">
            {!item.width || !item.length || !item.height || item.weight == null
              ? "Drop this item onto the pallet to capture its dimensions, then suggestions will appear."
              : "No valid placement found. Free space, adjust the pallet, or try Auto Arrange."}
          </p>
          <Button size="sm" variant="ghost" onClick={onDismiss} className="h-7 text-xs">
            Dismiss
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <p className="text-muted-foreground">Layer</p>
              <p className="font-medium tabular-nums">{suggestion.z}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Position</p>
              <p className="font-medium tabular-nums">x{suggestion.x}" · y{suggestion.y}"</p>
            </div>
            <div>
              <p className="text-muted-foreground">Weight after</p>
              <p className="font-medium tabular-nums">
                {suggestion.impact.weightAfter.toLocaleString()} / {suggestion.impact.weightCapacity.toLocaleString()} lbs
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Utilization</p>
              <p className="font-medium tabular-nums">{suggestion.impact.utilizationAfter}%</p>
            </div>
          </div>

          {suggestion.reasons.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {suggestion.reasons.map((r, i) => (
                <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex items-center gap-1.5">
            <Button size="sm" onClick={onPlace} className="flex-1 gap-1.5 h-8 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Place Automatically
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss} className="h-8 text-xs">
              Dismiss
            </Button>
          </div>
        </>
      )}
    </div>
  );
};