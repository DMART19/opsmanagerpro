import { useState, useEffect } from "react";
import { Trash2, Move, Copy, X, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onMove?: () => void;
  onDuplicate?: () => void;
  onClearSelection: () => void;
  isDeleting?: boolean;
}

export const BulkActionsBar = ({
  selectedCount,
  onDelete,
  onMove,
  onDuplicate,
  onClearSelection,
  isDeleting = false,
}: BulkActionsBarProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (selectedCount > 0) {
      // Small delay for smooth animation
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [selectedCount]);

  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out",
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl shadow-2xl backdrop-blur-sm">
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-3 border-r border-border">
          <div className="flex items-center justify-center h-7 min-w-[28px] px-2 bg-primary text-primary-foreground rounded-md text-sm font-bold">
            {selectedCount}
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {selectedCount === 1 ? "item selected" : "items selected"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {onMove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMove}
              className="gap-1.5 h-10 min-h-[40px] px-3"
            >
              <Move className="h-4 w-4" />
              <span className="hidden sm:inline">Move</span>
            </Button>
          )}
          
          {onDuplicate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDuplicate}
              className="gap-1.5 h-10 min-h-[40px] px-3"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Duplicate</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="gap-1.5 h-10 min-h-[40px] px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isDeleting ? "Deleting..." : "Delete"}
            </span>
          </Button>
        </div>

        {/* Clear selection */}
        <div className="pl-2 border-l border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            className="h-10 w-10 min-h-[40px] min-w-[40px] text-muted-foreground hover:text-foreground"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
