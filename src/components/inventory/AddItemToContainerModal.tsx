/**
 * Add Item to Container Modal
 * 
 * Allows users to specify how many units of an item to add to a container.
 * Supports adding full quantity or a partial amount.
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, AlertCircle } from "lucide-react";

interface InventoryItem {
  id: string;
  description: string | null;
  subcategory: string | null;
  quantity_available: number | null;
  status_item: string | null;
}

interface AddItemToContainerModalProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (itemId: string, quantity: number) => Promise<void>;
  isPending: boolean;
}

export const AddItemToContainerModal = ({
  item,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: AddItemToContainerModalProps) => {
  const [quantity, setQuantity] = useState<string>("1");
  const [error, setError] = useState<string | null>(null);

  const maxQuantity = item?.quantity_available ?? 0;

  // Reset state when modal opens with new item
  useEffect(() => {
    if (open && item) {
      // Default to full quantity if 1 or less, otherwise start at 1
      setQuantity(maxQuantity <= 1 ? String(maxQuantity) : "1");
      setError(null);
    }
  }, [open, item, maxQuantity]);

  const handleQuantityChange = (value: string) => {
    setError(null);
    // Allow empty string for typing
    if (value === "") {
      setQuantity("");
      return;
    }
    // Only allow positive integers
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      setQuantity(String(num));
    }
  };

  const handleAddAll = () => {
    setQuantity(String(maxQuantity));
    setError(null);
  };

  const handleConfirm = async () => {
    const qty = parseInt(quantity, 10);
    
    if (isNaN(qty) || qty <= 0) {
      setError("Please enter a valid quantity");
      return;
    }
    
    if (qty > maxQuantity) {
      setError(`Maximum available quantity is ${maxQuantity}`);
      return;
    }

    if (!item) return;

    await onConfirm(item.id, qty);
    onOpenChange(false);
  };

  if (!item) return null;

  const qtyNum = parseInt(quantity, 10) || 0;
  const isValid = qtyNum > 0 && qtyNum <= maxQuantity;
  const isAddingAll = qtyNum === maxQuantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Add to Container
          </DialogTitle>
          <DialogDescription>
            Choose how many units to add to this container
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item Info */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="font-medium text-sm">{item.description || "Unnamed item"}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {item.subcategory || "No category"}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <Badge variant="secondary" className="text-xs">
                {maxQuantity} available
              </Badge>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to add</Label>
            <div className="flex gap-2">
              <Input
                id="quantity"
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="flex-1"
                placeholder="Enter quantity"
              />
              {maxQuantity > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddAll}
                  className="shrink-0"
                >
                  Add All ({maxQuantity})
                </Button>
              )}
            </div>
            
            {error && (
              <div className="flex items-center gap-1.5 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          {/* Summary */}
          {isValid && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm">
                {isAddingAll ? (
                  <span>
                    Adding <strong>all {qtyNum}</strong> units to this container
                  </span>
                ) : (
                  <span>
                    Adding <strong>{qtyNum}</strong> of {maxQuantity} units.{" "}
                    <strong>{maxQuantity - qtyNum}</strong> will remain unassigned.
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isPending}
          >
            {isPending ? "Adding..." : `Add ${qtyNum > 0 ? qtyNum : ""} to Container`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
