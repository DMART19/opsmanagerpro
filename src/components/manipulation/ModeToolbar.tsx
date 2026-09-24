import { Move3D, RotateCw, ArrowUpDown, Magnet, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TransformMode } from "@/lib/manipulation/types";

/** Shared W / E / R mode dock used by both 3D builders. */
export default function ModeToolbar({
  mode,
  onMode,
  snapping,
  onToggleSnapping,
  onFocus,
  focusDisabled,
  className,
}: {
  mode: TransformMode;
  onMode: (m: TransformMode) => void;
  snapping: boolean;
  onToggleSnapping: () => void;
  onFocus?: () => void;
  focusDisabled?: boolean;
  className?: string;
}) {
  const items: { m: TransformMode; icon: typeof Move3D; label: string; key: string }[] = [
    { m: "move", icon: Move3D, label: "Move", key: "W" },
    { m: "rotate", icon: RotateCw, label: "Rotate", key: "E" },
    { m: "vertical", icon: ArrowUpDown, label: "Vertical move", key: "R" },
  ];
  return (
    <div className={cn("viewport-glass flex items-center gap-1 rounded-xl p-1", className)}>
      {items.map(({ m, icon: Icon, label, key }) => (
        <Tooltip key={m}>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={mode === m ? "default" : "ghost"}
              className="h-8 gap-1.5 px-2"
              onClick={() => onMode(m)}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">{label}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{label} ({key})</TooltipContent>
        </Tooltip>
      ))}
      <div className="mx-1 h-6 w-px bg-border/60" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant={snapping ? "default" : "ghost"}
            className="h-8 px-2"
            onClick={onToggleSnapping}
          >
            <Magnet className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Smart snapping {snapping ? "on" : "off"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={onFocus} disabled={focusDisabled}>
            <Crosshair className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Focus selection (F)</TooltipContent>
      </Tooltip>
    </div>
  );
}
