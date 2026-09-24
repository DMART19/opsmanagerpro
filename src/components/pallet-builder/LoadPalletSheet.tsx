import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SavedPalletBuild } from "@/hooks/use-saved-pallet-builds";
import { Package, Trash2, Calendar, Copy, FileInput } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

interface LoadPalletSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedBuilds: SavedPalletBuild[];
  loading: boolean;
  onLoad: (build: SavedPalletBuild) => void;
  onDelete: (id: string) => void;
}

export const LoadPalletSheet = ({
  open,
  onOpenChange,
  savedBuilds,
  loading,
  onLoad,
  onDelete,
}: LoadPalletSheetProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);

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

  const builds = savedBuilds.filter(b => !b.is_template);
  const templates = savedBuilds.filter(b => b.is_template);

  const renderBuildCard = (build: SavedPalletBuild, isTemplate: boolean) => (
    <Card
      key={build.id}
      className="cursor-pointer hover:border-primary transition-colors"
      onClick={() => {
        onLoad(build);
        onOpenChange(false);
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{build.name}</CardTitle>
              {isTemplate && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Copy className="h-3 w-3" />
                  Template
                </Badge>
              )}
            </div>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(build.created_at), "MMM d, yyyy 'at' h:mm a")}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => handleDeleteClick(build.id, e)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Pallet Type</p>
            <p className="font-medium capitalize">{build.pallet_data.selectedPalletType}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Items</p>
            <p className="font-medium">{build.pallet_data.placedCases.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Dimensions</p>
            <p className="font-medium">
              {build.pallet_data.palletDimensions.width}" × {build.pallet_data.palletDimensions.length}"
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Max Weight</p>
            <p className="font-medium">{build.pallet_data.maxWeight} lbs</p>
          </div>
        </div>
        {isTemplate && (
          <div className="mt-3 flex items-center gap-2 text-xs text-primary bg-primary/5 p-2 rounded border border-primary/10">
            <FileInput className="h-3.5 w-3.5" />
            <span>Apply this template to start a new build with this layout</span>
          </div>
        )}
        {build.pallet_data.hasWarnings && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
            <span>⚠️ Saved with warnings</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderEmptyState = (type: "build" | "template") => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Package className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">
        No saved {type === "template" ? "templates" : "builds"} yet
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        {type === "template"
          ? "Save a pallet layout as a template to reuse it later"
          : "Build a pallet and click Save to store it here"}
      </p>
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Load Saved Pallet</SheetTitle>
            <SheetDescription>
              Restore a saved build or apply a reusable template
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="builds" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="builds">
                Builds {builds.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{builds.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="templates">
                Templates {templates.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{templates.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="builds">
              <ScrollArea className="h-[calc(100vh-200px)]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                ) : builds.length === 0 ? (
                  renderEmptyState("build")
                ) : (
                  <div className="grid gap-4 pr-4 pt-2">
                    {builds.map(b => renderBuildCard(b, false))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="templates">
              <ScrollArea className="h-[calc(100vh-200px)]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                ) : templates.length === 0 ? (
                  renderEmptyState("template")
                ) : (
                  <div className="grid gap-4 pr-4 pt-2">
                    {templates.map(b => renderBuildCard(b, true))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Saved Pallet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this? This action cannot be undone.
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
