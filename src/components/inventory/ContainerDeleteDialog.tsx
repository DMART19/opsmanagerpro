import { useState, useMemo } from "react";
import { AlertTriangle, Package, Box, ArrowRight, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CacheInventoryItem } from "@/hooks/use-cache-inventory";

type DeleteAction = "move" | "delete-all" | null;

interface ContainerDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: CacheInventoryItem | null;
  allItems: CacheInventoryItem[];
  onConfirmDelete: (action: "move" | "delete-all", moveTargetId?: string) => Promise<void>;
  isDeleting?: boolean;
}

export const ContainerDeleteDialog = ({
  open,
  onOpenChange,
  container,
  allItems,
  onConfirmDelete,
  isDeleting = false,
}: ContainerDeleteDialogProps) => {
  const [action, setAction] = useState<DeleteAction>(null);
  const [moveTarget, setMoveTarget] = useState<string>("__none__");

  // Count contents
  const contents = useMemo(() => {
    if (!container) return { items: 0, containers: 0, total: 0 };
    const children = allItems.filter(i => i.container_id === container.id);
    const itemCount = children.filter(i => i.asset_type !== "container").length;
    const containerCount = children.filter(i => i.asset_type === "container").length;
    return { items: itemCount, containers: containerCount, total: children.length };
  }, [container, allItems]);

  // Get all descendant IDs (recursive) to exclude from move targets
  const descendantIds = useMemo(() => {
    if (!container) return new Set<string>();
    const ids = new Set<string>();
    const collect = (parentId: string) => {
      allItems.forEach(item => {
        if (item.container_id === parentId && !ids.has(item.id)) {
          ids.add(item.id);
          if (item.asset_type === "container") collect(item.id);
        }
      });
    };
    collect(container.id);
    return ids;
  }, [container, allItems]);

  // Available move targets (other containers, excluding self and descendants)
  const moveTargets = useMemo(() => {
    if (!container) return [];
    return allItems
      .filter(i =>
        i.asset_type === "container" &&
        i.id !== container.id &&
        !descendantIds.has(i.id)
      )
      .map(i => ({ id: i.id, label: i.box_number || i.description || "Container" }));
  }, [container, allItems, descendantIds]);

  const handleConfirm = async () => {
    if (!action) return;
    await onConfirmDelete(action, action === "move" ? (moveTarget === "__none__" ? undefined : moveTarget) : undefined);
    setAction(null);
    setMoveTarget("__none__");
  };

  const handleClose = (v: boolean) => {
    if (!isDeleting) {
      onOpenChange(v);
      if (!v) {
        setAction(null);
        setMoveTarget("__none__");
      }
    }
  };

  const containerName = container?.box_number || container?.description || "this container";

  // If container has no contents, show simple delete dialog
  if (contents.total === 0) {
    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Container
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to delete "{containerName}"?</p>
              <p className="text-destructive text-sm">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => onConfirmDelete("delete-all")}
            >
              {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Container
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                <span className="font-medium text-foreground">"{containerName}"</span> contains:
              </p>
              
              {/* Contents summary */}
              <div className="flex gap-3">
                {contents.items > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{contents.items}</span>
                    <span className="text-muted-foreground">item{contents.items !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {contents.containers > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    <Box className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{contents.containers}</span>
                    <span className="text-muted-foreground">container{contents.containers !== 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>

              {/* Action selection */}
              <div className="space-y-3 pt-1">
                {/* Move Contents option */}
                <button
                  type="button"
                  onClick={() => setAction("move")}
                  className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                    action === "move"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-primary/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Move contents, then delete</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Move all {contents.total} item{contents.total !== 1 ? "s" : ""} to another container or unassign
                      </p>
                    </div>
                  </div>
                </button>

                {/* Move target selector */}
                {action === "move" && (
                  <div className="pl-7">
                    <Select value={moveTarget} onValueChange={setMoveTarget}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No container (unassign)</SelectItem>
                        {moveTargets.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Delete All option */}
                <button
                  type="button"
                  onClick={() => setAction("delete-all")}
                  className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                    action === "delete-all"
                      ? "border-destructive bg-destructive/5 ring-1 ring-destructive/20"
                      : "border-border hover:border-destructive/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-4 w-4 text-destructive shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Delete everything</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Permanently delete the container and all {contents.total} item{contents.total !== 1 ? "s" : ""} inside
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant={action === "delete-all" ? "destructive" : "default"}
            disabled={!action || isDeleting}
            onClick={handleConfirm}
          >
            {isDeleting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
            ) : action === "move" ? (
              "Move & Delete"
            ) : action === "delete-all" ? (
              "Delete All"
            ) : (
              "Choose an action"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
