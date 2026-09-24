import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Ruler, Weight, Package, Info } from "lucide-react";

export interface CapturedDimensions {
  length: number;
  width: number;
  height: number;
  weight?: number;
}

export interface DimensionCaptureResult {
  dimensions: CapturedDimensions;
  saveGlobally: boolean;
}

interface DimensionCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemId: string;
  existingDimensions?: Partial<CapturedDimensions>;
  onConfirm: (result: DimensionCaptureResult) => void;
  onCancel: () => void;
  /** Hide "Save to item" checkbox when dimensions belong to build context only */
  hideSaveGlobally?: boolean;
}

export const DimensionCaptureModal = ({
  open,
  onOpenChange,
  itemName,
  itemId,
  existingDimensions,
  onConfirm,
  onCancel,
  hideSaveGlobally = false,
}: DimensionCaptureModalProps) => {
  const [length, setLength] = useState(existingDimensions?.length?.toString() || "");
  const [width, setWidth] = useState(existingDimensions?.width?.toString() || "");
  const [height, setHeight] = useState(existingDimensions?.height?.toString() || "");
  const [weight, setWeight] = useState(existingDimensions?.weight?.toString() || "");
  const [saveGlobally, setSaveGlobally] = useState(false);

  const lengthNum = parseFloat(length);
  const widthNum = parseFloat(width);
  const heightNum = parseFloat(height);
  const weightNum = parseFloat(weight);

  // All fields are required for placement
  const isValid = lengthNum > 0 && widthNum > 0 && heightNum > 0 && weightNum > 0;

  const handleConfirm = () => {
    if (!isValid) return;
    
    onConfirm({
      dimensions: {
        length: lengthNum,
        width: widthNum,
        height: heightNum,
        weight: weightNum,
      },
      saveGlobally,
    });
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-primary" />
            Dimensions & Weight Required
          </DialogTitle>
          <DialogDescription>
            Dimensions and weight are required for accurate pallet planning.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Item Info */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Package className="h-5 w-5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">{itemName}</div>
              <div className="text-xs text-muted-foreground">{itemId}</div>
            </div>
          </div>

          {/* Dimension Inputs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="length" className="text-xs">
                Length (in)
              </Label>
              <Input
                id="length"
                type="number"
                min="1"
                step="0.5"
                placeholder="12"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="h-9"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="width" className="text-xs">
                Width (in)
              </Label>
              <Input
                id="width"
                type="number"
                min="1"
                step="0.5"
                placeholder="12"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="height" className="text-xs">
                Height (in)
              </Label>
              <Input
                id="height"
                type="number"
                min="1"
                step="0.5"
                placeholder="12"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Weight (Required) */}
          <div className="space-y-1.5">
            <Label htmlFor="weight" className="text-xs flex items-center gap-1">
              <Weight className="h-3 w-3" />
              Weight (lbs)
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="weight"
              type="number"
              min="0.1"
              step="1"
              placeholder="50"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Required for accurate weight calculations
            </p>
          </div>

          {/* Save Globally Option — hidden for Items/Containers */}
          {!hideSaveGlobally && (
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border">
              <Checkbox
                id="save-globally"
                checked={saveGlobally}
                onCheckedChange={(checked) => setSaveGlobally(checked === true)}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="save-globally"
                  className="text-sm font-medium cursor-pointer"
                >
                  Save dimensions to item
                </Label>
                <p className="text-xs text-muted-foreground">
                  Updates the item globally so you won't need to enter dimensions again.
                </p>
              </div>
            </div>
          )}

          {/* Info Note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              {hideSaveGlobally
                ? "These values apply to this pallet build only and won't affect your inventory records."
                : "Without saving, these values apply only to this placement."}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Place Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
