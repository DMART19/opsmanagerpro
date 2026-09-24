import { X, Trash2, Download, BookOpen, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileTeamBulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
  onExport: () => void;
  onAssignTraining: () => void;
}

export const MobileTeamBulkActionsBar = ({
  selectedCount,
  onClearSelection,
  onDelete,
  onExport,
  onAssignTraining,
}: MobileTeamBulkActionsBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur-sm border-t shadow-lg",
        "animate-in slide-in-from-bottom-4 duration-300",
        "safe-area-inset-bottom"
      )}
    >
      <div className="px-4 py-3">
        {/* Top row: Selection info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">
              {selectedCount} selected
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-muted-foreground h-8 px-2"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>

        {/* Action buttons - grid layout for mobile */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onAssignTraining}
            className="h-12 flex-col gap-1"
          >
            <BookOpen className="h-4 w-4" />
            <span className="text-xs">Assign</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-12 flex-col gap-1"
          >
            <Download className="h-4 w-4" />
            <span className="text-xs">Export</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="h-12 flex-col gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-xs">Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
