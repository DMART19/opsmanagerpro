import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogIn, Loader2, AlertTriangle, Calendar, User } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useItemCheckout, ItemCheckout, isCheckoutOverdue } from "@/hooks/use-item-checkout";
import { Badge } from "@/components/ui/badge";

interface ItemCheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkout: ItemCheckout | null;
  onSuccess?: () => void;
}

const CONDITION_OPTIONS = [
  { value: "excellent", label: "Excellent - Like New" },
  { value: "good", label: "Good - Normal Wear" },
  { value: "fair", label: "Fair - Needs Attention" },
  { value: "poor", label: "Poor - Requires Service" },
  { value: "damaged", label: "Damaged - Needs Repair" },
];

export const ItemCheckinDialog = ({ 
  open, 
  onOpenChange, 
  checkout, 
  onSuccess 
}: ItemCheckinDialogProps) => {
  const { checkinItem, loading } = useItemCheckout();
  
  const [condition, setCondition] = useState("good");
  const [notes, setNotes] = useState("");
  const [returnQuantity, setReturnQuantity] = useState(1);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open && checkout) {
      setCondition("good");
      setNotes("");
      setReturnQuantity(checkout.checked_out_quantity);
    }
  }, [open, checkout]);

  if (!checkout) return null;

  const isOverdue = isCheckoutOverdue(checkout);
  const employeeName = checkout.employee 
    ? `${checkout.employee.first_name} ${checkout.employee.last_name}`
    : "Unknown";
  const itemName = checkout.item?.description || "Item";
  const maxQuantity = checkout.checked_out_quantity;
  const isPartialReturn = returnQuantity < maxQuantity;

  const handleSubmit = async () => {
    const success = await checkinItem({
      checkoutId: checkout.id,
      condition,
      notes: notes.trim() || undefined,
      returnQuantity,
    });

    if (success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const canSubmit = returnQuantity > 0 && returnQuantity <= maxQuantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-primary" />
            Check In Item
          </DialogTitle>
          <DialogDescription>
            Return this item and record its condition
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Checkout Info */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-3">
            <div>
              <p className="text-sm font-medium">{itemName}</p>
              {checkout.item?.id_cache_fema && (
                <span className="text-xs text-muted-foreground font-mono">
                  {checkout.item.id_cache_fema}
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="gap-1">
                <User className="h-3 w-3" />
                {employeeName}
              </Badge>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                Checked out: {checkout.checked_out_quantity}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                Checked out {formatDistanceToNow(new Date(checkout.checked_out_at), { addSuffix: true })}
              </span>
            </div>
            
            {/* Overdue warning */}
            {isOverdue && checkout.expected_return_at && (
              <div className="flex items-center gap-2 text-destructive text-xs p-2 bg-destructive/10 rounded">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>
                  Overdue by {formatDistanceToNow(new Date(checkout.expected_return_at))}
                </span>
              </div>
            )}

            {checkout.checkout_notes && (
              <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                <span className="font-medium">Checkout notes:</span> {checkout.checkout_notes}
              </div>
            )}
          </div>

          {/* Return Quantity - only show if more than 1 was checked out */}
          {maxQuantity > 1 && (
            <div className="space-y-2">
              <Label htmlFor="returnQuantity">Quantity to Return *</Label>
              <Input
                id="returnQuantity"
                type="number"
                min={1}
                max={maxQuantity}
                value={returnQuantity}
                onChange={(e) => setReturnQuantity(Math.min(parseInt(e.target.value) || 1, maxQuantity))}
              />
              <p className="text-xs text-muted-foreground">
                Max: {maxQuantity} • {isPartialReturn ? (
                  <span className="text-warning font-medium">
                    Partial return — {maxQuantity - returnQuantity} will remain checked out
                  </span>
                ) : "Full return"}
              </p>
            </div>
          )}

          {/* Condition */}
          <div className="space-y-2">
            <Label htmlFor="condition">Item Condition *</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger id="condition">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any damage, issues, or service needs..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                {isPartialReturn ? `Return ${returnQuantity}` : "Check In"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};