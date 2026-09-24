import { Sparkles, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlacedCase } from "@/types/pallet-builder";

interface Props {
  placedCases: PlacedCase[];
  onAutoBuild: () => void;
  canAutoBuild: boolean;
}

/**
 * Compact horizontal band above the canvas that summarizes what inventory
 * has been added to the pallet. Helps a first-time user understand what
 * will be placed and surfaces the Auto Build CTA as the primary action.
 */
export const SelectedInventoryBar = ({ placedCases, onAutoBuild, canAutoBuild }: Props) => {
  // Group placed cases by source name
  const grouped = new Map<string, { name: string; count: number; weight: number }>();
  for (const c of placedCases) {
    const key = c.caseId || c.caseType || "Item";
    const g = grouped.get(key) || { name: key, count: 0, weight: 0 };
    g.count += 1;
    g.weight += c.weight || 0;
    grouped.set(key, g);
  }
  const items = Array.from(grouped.values()).sort((a, b) => b.count - a.count);
  const totalItems = placedCases.length;
  const totalWeight = placedCases.reduce((s, c) => s + (c.weight || 0), 0);

  if (totalItems === 0) {
    return (
      <div className="border-b border-border/30 bg-background/60 px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground min-w-0">
          <Package className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className="truncate">No inventory selected yet — pick items from the sidebar or use Auto Build.</span>
        </div>
        <Button
          size="sm"
          variant="default"
          className="h-8 gap-1.5 shrink-0"
          onClick={onAutoBuild}
          disabled={!canAutoBuild}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Auto Build Pallet
        </Button>
      </div>
    );
  }

  return (
    <div className="border-b border-border/30 bg-background/60 px-4 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium shrink-0">
          Selected
        </span>
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto scrollbar-none">
          {items.slice(0, 6).map((g) => (
            <Badge
              key={g.name}
              variant="secondary"
              className="h-6 px-2 text-[11px] font-medium shrink-0 tabular-nums"
            >
              <span className="truncate max-w-[140px]">{g.name}</span>
              <span className="ml-1 opacity-70">× {g.count}</span>
            </Badge>
          ))}
          {items.length > 6 && (
            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
              +{items.length - 6} more
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-[11px] text-muted-foreground tabular-nums hidden md:flex items-center gap-2">
          <span>Items: <span className="text-foreground font-semibold">{totalItems}</span></span>
          <span className="opacity-40">•</span>
          <span>Weight: <span className="text-foreground font-semibold">{Math.round(totalWeight)} lbs</span></span>
        </div>
        <Button
          size="sm"
          variant="default"
          className="h-8 gap-1.5"
          onClick={onAutoBuild}
          disabled={!canAutoBuild}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Auto Build
        </Button>
      </div>
    </div>
  );
};