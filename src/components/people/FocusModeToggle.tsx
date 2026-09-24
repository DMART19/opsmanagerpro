import { AlertTriangle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTeamFilter, FocusModeType } from "@/contexts/TeamFilterContext";
import { cn } from "@/lib/utils";

interface FocusModeToggleProps {
  needsAttentionCount: number;
}

export const FocusModeToggle = ({ needsAttentionCount }: FocusModeToggleProps) => {
  const { focusMode, setFocusMode, setActiveFilter } = useTeamFilter();

  // Hide entirely if no one needs attention
  if (needsAttentionCount === 0) {
    return null;
  }

  const handleModeChange = (mode: FocusModeType) => {
    setFocusMode(mode);
    if (mode === "needs-attention") {
      setActiveFilter("incomplete");
    } else {
      setActiveFilter(null);
    }
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            variant={focusMode === "all" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-8 gap-1.5 transition-all",
              focusMode === "all" && "bg-background shadow-sm"
            )}
            onClick={() => handleModeChange("all")}
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">All</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Show all team members</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            variant={focusMode === "needs-attention" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-8 gap-1.5 transition-all",
              focusMode === "needs-attention" && "bg-warning/20 text-warning border-warning/30 shadow-sm"
            )}
            onClick={() => handleModeChange("needs-attention")}
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Needs Attention</span>
            <span className={cn(
              "text-xs font-semibold px-1.5 py-0.5 rounded-full",
              focusMode === "needs-attention" 
                ? "bg-warning text-warning-foreground" 
                : "bg-warning/20 text-warning"
            )}>
              {needsAttentionCount}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Members with missing or expiring credentials
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
