import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SavedPalletBuild } from "@/hooks/use-saved-pallet-builds";
import {
  Package,
  Trash2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SavedBuildsPanelProps {
  savedBuilds: SavedPalletBuild[];
  loading: boolean;
  activeBuildId: string | null;
  onLoad: (build: SavedPalletBuild) => void;
  onDelete: (id: string) => void;
}

export const SavedBuildsPanel = ({
  savedBuilds,
  loading,
  activeBuildId,
  onLoad,
  onDelete,
}: SavedBuildsPanelProps) => {
  const [expanded, setExpanded] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);

  const builds = savedBuilds.filter((b) => !b.is_template);

  const handleDeleteClick = (buildId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBuildId(buildId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedBuildId) {
      onDelete(selectedBuildId);
      setSelectedBuildId(null);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <TooltipProvider>
      <div className="border-t shrink-0">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Saved Builds</span>
            {builds.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {builds.length}
              </Badge>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Content */}
        {expanded && (
          <div className="px-3 pb-3">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : builds.length === 0 ? (
              <div className="py-6 text-center">
                <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No saved builds yet
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Save a pallet layout to access it here
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[240px]">
                <div className="space-y-1">
                  {builds.map((build) => {
                    const isActive = activeBuildId === build.id;
                    const itemCount = build.pallet_data.placedCases.length;
                    const totalWeight = build.pallet_data.placedCases.reduce(
                      (sum, c) => sum + c.weight,
                      0
                    );

                    return (
                      <div
                        key={build.id}
                        onClick={() => onLoad(build)}
                        className={cn(
                          "group flex items-center gap-2 rounded-md px-2.5 py-2 cursor-pointer transition-colors text-left w-full",
                          isActive
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted/80 border border-transparent"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "text-sm font-medium truncate",
                                isActive && "text-primary"
                              )}
                            >
                              {build.name}
                            </span>
                            {isActive && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4 px-1 bg-primary/5 text-primary border-primary/20 shrink-0"
                              >
                                Active
                              </Badge>
                            )}
                            {build.pallet_data.hasWarnings && (
                              <span className="text-amber-500 text-xs shrink-0">⚠</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>
                              {build.pallet_data.palletDimensions.width}″×
                              {build.pallet_data.palletDimensions.length}″
                            </span>
                            <span>·</span>
                            <span>
                              {itemCount} item{itemCount !== 1 ? "s" : ""}
                            </span>
                            <span>·</span>
                            <span>{totalWeight.toLocaleString()} lbs</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {format(new Date(build.updated_at), "MMM d, yyyy")}
                          </div>
                        </div>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={(e) => handleDeleteClick(build.id, e)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">Delete build</TooltipContent>
                        </Tooltip>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Saved Build</AlertDialogTitle>
              <AlertDialogDescription>
                This build will be permanently removed. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};
