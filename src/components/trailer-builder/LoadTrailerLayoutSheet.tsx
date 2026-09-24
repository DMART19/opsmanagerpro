import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SavedTrailerLayout } from "@/hooks/use-saved-trailer-layouts";
import { Truck, Trash2, Calendar } from "lucide-react";
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
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LoadTrailerLayoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedLayouts: SavedTrailerLayout[];
  loading: boolean;
  onLoad: (layout: SavedTrailerLayout) => void;
  onDelete: (id: string) => void;
}

export const LoadTrailerLayoutSheet = ({
  open,
  onOpenChange,
  savedLayouts,
  loading,
  onLoad,
  onDelete,
}: LoadTrailerLayoutSheetProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);

  const handleDeleteClick = (layoutId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLayoutId(layoutId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedLayoutId) {
      onDelete(selectedLayoutId);
      setSelectedLayoutId(null);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Load Saved Layout</SheetTitle>
            <SheetDescription>
              Select a previously saved trailer layout to restore
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Loading saved layouts...</p>
              </div>
            ) : savedLayouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Truck className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No saved layouts yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Build a trailer layout and click Save to store it here
                </p>
              </div>
            ) : (
              <div className="grid gap-4 pr-4">
                {savedLayouts.map((layout) => (
                  <Card
                    key={layout.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => {
                      onLoad(layout);
                      onOpenChange(false);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{layout.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(layout.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteClick(layout.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Trailer ID</p>
                          <p className="font-medium text-xs">{layout.trailer_id.slice(0, 8)}...</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pallets</p>
                          <p className="font-medium">{layout.layout_data.placedPallets.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Weight</p>
                          <p className="font-medium">{layout.layout_data.totalWeight.toFixed(0)} lbs</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Space Used</p>
                          <p className="font-medium">{layout.layout_data.usedSpace.toFixed(0)} sq in</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Saved Layout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trailer layout? This action cannot be undone.
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
    </>
  );
};
