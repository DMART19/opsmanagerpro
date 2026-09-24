import { X, Trash2, Download, MoveHorizontal, Wrench, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface FloatingBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
  onExport?: () => void;
  onMove?: () => void;
  onAdjust?: () => void;
  onArchive?: () => void;
  className?: string;
}

export const FloatingBulkActions = ({
  selectedCount,
  onClearSelection,
  onDelete,
  onExport,
  onMove,
  onAdjust,
  onArchive,
  className,
}: FloatingBulkActionsProps) => {
  if (selectedCount === 0) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "bg-card border shadow-xl rounded-full px-4 py-2",
        "flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200",
        className
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 pl-1">
        <span className="font-medium text-sm">
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
        </span>
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {onMove && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={onMove}
              >
                <MoveHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Move</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Move items between storage areas or containers</TooltipContent>
          </Tooltip>
        )}

        {onAdjust && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={onAdjust}
              >
                <Wrench className="h-4 w-4" />
                <span className="hidden sm:inline">Adjust</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Adjust quantity for selected items</TooltipContent>
          </Tooltip>
        )}

        {onArchive && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={onArchive}
              >
                <Archive className="h-4 w-4" />
                <span className="hidden sm:inline">Archive</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Archive selected items</TooltipContent>
          </Tooltip>
        )}

        {onExport && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={onExport}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Export selected items</TooltipContent>
          </Tooltip>
        )}
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Delete</span>
        </Button>
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Clear selection */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={onClearSelection}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
