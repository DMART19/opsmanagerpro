import { useState } from "react";
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
import { Wand2, AlertTriangle, Info } from "lucide-react";

interface SmartArrangeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemCount: number;
  arrangeAllLayers: boolean;
}

export const SmartArrangeConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  itemCount,
  arrangeAllLayers,
}: SmartArrangeConfirmDialogProps) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Smart Arrange
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Smart Arrange will automatically reorganize {itemCount} item{itemCount !== 1 ? "s" : ""} 
                {arrangeAllLayers ? " across all layers" : " on the current layer"} for optimal placement.
              </p>
              
              <div className="flex items-start gap-2 p-3 bg-muted rounded-md text-sm">
                <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">What happens:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                    <li>Items are sorted by weight (heaviest first)</li>
                    <li>Fragile items are placed on top</li>
                    <li>Positions are optimized for stability</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  If items cannot fit, they will be noted but <strong>never deleted</strong>. 
                  You can undo this action with <kbd className="px-1 bg-background rounded border text-xs">Ctrl+Z</kbd>.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="gap-2">
            <Wand2 className="h-4 w-4" />
            Arrange Items
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
