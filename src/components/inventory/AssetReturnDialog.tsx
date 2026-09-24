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
import { LogIn, Package, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useAssetCheckout } from "@/hooks/use-asset-checkout";
import { Badge } from "@/components/ui/badge";

interface Checkout {
  id: string;
  quantity: number;
  checkout_date: string;
  due_date?: string;
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
  equipment?: {
    id: string;
    name: string;
    asset_tag: string;
  };
}

interface AssetReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkout: Checkout | null;
  onSuccess?: () => void;
}

export const AssetReturnDialog = ({ 
  open, 
  onOpenChange, 
  checkout, 
  onSuccess 
}: AssetReturnDialogProps) => {
  const { returnAsset, loading } = useAssetCheckout();
  
  const [condition, setCondition] = useState("good");
  const [returnLocation, setReturnLocation] = useState("");
  const [notes, setNotes] = useState("");

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCondition("good");
      setReturnLocation("");
      setNotes("");
    }
  }, [open]);

  if (!checkout) return null;

  const staffName = checkout.staff 
    ? `${checkout.staff.first_name} ${checkout.staff.last_name}`
    : "Unknown";
  
  const equipmentName = checkout.equipment?.name || "Asset";
  const assetTag = checkout.equipment?.asset_tag || "";

  const handleSubmit = async () => {
    const success = await returnAsset({
      checkoutId: checkout.id,
      condition,
      returnLocation,
      notes,
    });

    if (success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-primary" />
            Return Asset
          </DialogTitle>
          <DialogDescription>
            Confirm the return and record the asset condition
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Checkout Info */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{equipmentName}</p>
                <p className="text-xs text-muted-foreground font-mono">{assetTag}</p>
              </div>
              <Badge variant="outline" className="gap-1">
                <Package className="h-3 w-3" />
                Qty: {checkout.quantity}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded bg-background">
                <User className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Checked out to</p>
                  <p className="font-medium">{staffName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-background">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Checked out</p>
                  <p className="font-medium">
                    {format(new Date(checkout.checkout_date), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <Label htmlFor="condition">Asset Condition *</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger id="condition">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent - Like New</SelectItem>
                <SelectItem value="good">Good - Normal Wear</SelectItem>
                <SelectItem value="fair">Fair - Needs Attention</SelectItem>
                <SelectItem value="poor">Poor - Requires Service</SelectItem>
                <SelectItem value="needs_repair">Needs Repair</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Return Location */}
          <div className="space-y-2">
            <Label htmlFor="return-location">Return Location</Label>
            <Input
              id="return-location"
              placeholder="e.g., Section A-12, Main Warehouse"
              value={returnLocation}
              onChange={(e) => setReturnLocation(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any damage, issues, or service needs..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <LogIn className="h-4 w-4 mr-2" />
            {loading ? "Returning..." : "Return Asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
