import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Wand2, Scale, Route, RotateCcw, Undo2, Redo2, Layers } from "lucide-react";

interface Props {
  disabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  stopLegend: number[];
  onAutoArrange: () => void;
  onOptimizeWeight: () => void;
  onOptimizeStops: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export const TrailerBottomToolbar = ({
  disabled, canUndo, canRedo, onAutoArrange, onOptimizeWeight, onOptimizeStops, onReset, onUndo, onRedo,
}: Props) => (
  <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm px-2.5 py-1.5 shadow-sm">
    <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
    <span className="text-[11px] font-medium text-muted-foreground mr-1 hidden xl:inline">Load Tools</span>
    <Separator orientation="vertical" className="h-4 mx-1 bg-border/40" />

    <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onAutoArrange} disabled={disabled}>
      <Wand2 className="h-3.5 w-3.5" /> Auto Arrange
    </Button>
    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-border/50" onClick={onOptimizeWeight} disabled={disabled}>
      <Scale className="h-3.5 w-3.5" /> Optimize Weight
    </Button>
    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-border/50" onClick={onOptimizeStops} disabled={disabled}>
      <Route className="h-3.5 w-3.5" /> Optimize Stops
    </Button>

    <div className="flex-1" />

    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top"><p className="text-xs">Undo</p></TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onRedo} disabled={!canRedo}>
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top"><p className="text-xs">Redo</p></TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={onReset} disabled={disabled}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top"><p className="text-xs">Clear all cargo</p></TooltipContent>
    </Tooltip>
  </div>
);