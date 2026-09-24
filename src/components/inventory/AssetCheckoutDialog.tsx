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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, LogOut, AlertCircle, Package, AlertTriangle, ShieldAlert } from "lucide-react";
import { format, isPast, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useAssetCheckout } from "@/hooks/use-asset-checkout";
import { useStaff } from "@/hooks/use-staff";
import { Badge } from "@/components/ui/badge";

interface Equipment {
  id: string;
  name: string;
  asset_tag: string;
  total_quantity: number;
  available_quantity: number;
  checked_out_quantity: number;
  status: string;
  // Expiration support
  date_expire?: string | null;
}

interface AssetCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
  onSuccess?: () => void;
}

export const AssetCheckoutDialog = ({ 
  open, 
  onOpenChange, 
  equipment, 
  onSuccess 
}: AssetCheckoutDialogProps) => {
  const { checkoutAsset, loading } = useAssetCheckout();
  const { staff, loading: staffLoading } = useStaff();
  
  const [selectedStaff, setSelectedStaff] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [dueDate, setDueDate] = useState<Date>();
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedStaff("");
      setQuantity("1");
      setDueDate(undefined);
      setPurpose("");
      setNotes("");
      setLocation("");
    }
  }, [open]);

  if (!equipment) return null;

  const availableQuantity = equipment.available_quantity ?? 1;
  const totalQuantity = equipment.total_quantity ?? 1;
  const checkedOutQuantity = equipment.checked_out_quantity ?? 0;

  // Expiration logic
  const getExpirationStatus = () => {
    if (!equipment.date_expire) return null;
    const expiryDate = parseISO(equipment.date_expire);
    const now = new Date();
    const daysUntil = differenceInDays(expiryDate, now);
    
    if (isPast(expiryDate)) {
      return { isExpired: true, isExpiringSoon: false, daysUntil: Math.abs(daysUntil), date: expiryDate };
    }
    if (daysUntil <= 30) {
      return { isExpired: false, isExpiringSoon: true, daysUntil, date: expiryDate };
    }
    return null;
  };

  const expirationStatus = getExpirationStatus();
  const isExpired = expirationStatus?.isExpired ?? false;
  const isExpiringSoon = expirationStatus?.isExpiringSoon ?? false;

  const canCheckout = availableQuantity > 0 && !isExpired;
  const maxQuantity = availableQuantity;

  const quantityNum = parseInt(quantity, 10) || 0;

  const handleSubmit = async () => {
    if (!selectedStaff) {
      return;
    }

    if (quantityNum > availableQuantity) {
      return;
    }

    const success = await checkoutAsset({
      equipmentId: equipment.id,
      staffId: selectedStaff,
      quantity: quantityNum,
      dueDate,
      purpose,
      notes,
      deploymentLocation: location,
    });

    if (success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  // Filter only active staff
  const activeStaff = staff.filter(s => s.employment_status === "Active" || s.employment_status === "active" || !s.employment_status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-primary" />
            Check Out Asset
          </DialogTitle>
          <DialogDescription>
            Assign this asset to a team member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Equipment Info */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{equipment.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{equipment.asset_tag}</p>
              </div>
              <Badge variant="outline" className="gap-1">
                <Package className="h-3 w-3" />
                Stock
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 rounded bg-background">
                <p className="font-semibold text-lg">{totalQuantity}</p>
                <p className="text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-2 rounded bg-success/10">
                <p className="font-semibold text-lg text-success">{availableQuantity}</p>
                <p className="text-muted-foreground">Available</p>
              </div>
              <div className="text-center p-2 rounded bg-warning/10">
                <p className="font-semibold text-lg text-warning">{checkedOutQuantity}</p>
                <p className="text-muted-foreground">Checked Out</p>
              </div>
            </div>
          </div>

          {/* Expired Item Block */}
          {isExpired && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <ShieldAlert className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Cannot Check Out Expired Item</p>
                <p className="text-xs text-destructive/80 mt-1">
                  This item expired {expirationStatus?.daysUntil} day{expirationStatus?.daysUntil !== 1 ? 's' : ''} ago 
                  ({expirationStatus?.date && format(expirationStatus.date, "PPP")}). 
                  Review or remove from inventory before use.
                </p>
              </div>
            </div>
          )}

          {/* Expiring Soon Warning */}
          {isExpiringSoon && !isExpired && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-500">Item Expiring Soon</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                  This item expires in {expirationStatus?.daysUntil} day{expirationStatus?.daysUntil !== 1 ? 's' : ''} 
                  ({expirationStatus?.date && format(expirationStatus.date, "PPP")}). 
                  Consider this when assigning.
                </p>
              </div>
            </div>
          )}

          {!canCheckout && !isExpired && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">No available stock to checkout</p>
            </div>
          )}

          {canCheckout && (
            <>
              {/* Team Member Selection */}
              <div className="space-y-2">
                <Label htmlFor="staff">Team Member *</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger id="staff">
                    <SelectValue placeholder={staffLoading ? "Loading..." : "Select team member"} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeStaff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                        {member.position && (
                          <span className="text-muted-foreground ml-2">• {member.position}</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={maxQuantity}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    of {maxQuantity} available
                  </span>
                </div>
                {quantityNum > maxQuantity && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Quantity exceeds available stock
                  </p>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label>Expected Return Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Purpose */}
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Input
                  id="purpose"
                  placeholder="e.g., Field deployment, Training exercise"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Deployment Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Site A, Training Center"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special instructions or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!canCheckout || !selectedStaff || quantityNum > maxQuantity || quantityNum < 1 || loading}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {loading ? "Checking out..." : "Check Out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
