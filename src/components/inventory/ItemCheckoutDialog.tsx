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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, LogOut, Loader2, Check, ChevronsUpDown, AlertTriangle, User } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useItemCheckout } from "@/hooks/use-item-checkout";
import { useEmployees } from "@/hooks/use-employees";
import { CacheInventoryItem } from "@/hooks/use-cache-inventory";
import { Badge } from "@/components/ui/badge";

interface ItemCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CacheInventoryItem | null;
  onSuccess?: () => void;
}

export const ItemCheckoutDialog = ({ 
  open, 
  onOpenChange, 
  item, 
  onSuccess 
}: ItemCheckoutDialogProps) => {
  const { checkoutItem, loading } = useItemCheckout();
  const { employees, loading: employeesLoading } = useEmployees();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [quantity, setQuantity] = useState("1");
  const [expectedReturnDate, setExpectedReturnDate] = useState<Date | undefined>(
    addDays(new Date(), 7)
  );
  const [notes, setNotes] = useState("");
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedEmployeeId("");
      setQuantity("1");
      setExpectedReturnDate(addDays(new Date(), 7));
      setNotes("");
    }
  }, [open]);

  if (!item) return null;

  const availableQty = item.quantity_available ?? 0;
  const isExpired = item.date_expire && new Date(item.date_expire) < new Date();
  const isExpiringSoon = item.date_expire && !isExpired && 
    new Date(item.date_expire) < addDays(new Date(), 30);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  const quantityNum = parseInt(quantity, 10) || 0;

  const handleSubmit = async () => {
    if (!selectedEmployeeId) return;

    const success = await checkoutItem({
      itemId: item.id,
      employeeId: selectedEmployeeId,
      quantity: quantityNum,
      expectedReturnAt: expectedReturnDate,
      notes: notes.trim() || undefined,
    });

    if (success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const canSubmit = selectedEmployeeId && quantityNum > 0 && quantityNum <= availableQty && !isExpired;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-primary" />
            Check Out Item
          </DialogTitle>
          <DialogDescription>
            Assign this item to a team member and track its return
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item Info */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <p className="text-sm font-medium">{item.description || "Untitled Item"}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {item.id_cache_fema && (
                <span className="text-xs text-muted-foreground font-mono">
                  {item.id_cache_fema}
                </span>
              )}
              <Badge variant="outline" className="text-xs">
                {availableQty} available
              </Badge>
            </div>
            
            {/* Expiration warnings */}
            {isExpired && (
              <div className="flex items-center gap-2 text-destructive text-xs mt-2 p-2 bg-destructive/10 rounded">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>This item is expired and cannot be checked out</span>
              </div>
            )}
            {isExpiringSoon && (
              <div className="flex items-center gap-2 text-amber-600 text-xs mt-2 p-2 bg-amber-500/10 rounded">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>This item expires on {format(new Date(item.date_expire!), "PP")}</span>
              </div>
            )}
          </div>

          {/* Team Member Selector */}
          <div className="space-y-2">
            <Label>Team Member *</Label>
            <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={employeeSearchOpen}
                  className="w-full justify-between"
                  disabled={employeesLoading}
                >
                  {selectedEmployee ? (
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select team member...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search team members..." />
                  <CommandList>
                    <CommandEmpty>No team members found.</CommandEmpty>
                    <CommandGroup>
                      {employees
                        .filter(e => e.status?.toLowerCase() === "active")
                        .map((employee) => (
                          <CommandItem
                            key={employee.id}
                            value={`${employee.first_name} ${employee.last_name} ${employee.email || ""}`}
                            onSelect={() => {
                              setSelectedEmployeeId(employee.id);
                              setEmployeeSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedEmployeeId === employee.id 
                                  ? "opacity-100" 
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {employee.first_name} {employee.last_name}
                              </span>
                              {(employee.position || employee.email) && (
                                <span className="text-xs text-muted-foreground">
                                  {employee.position || employee.email}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Quantity */}
          {availableQty > 1 && (
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={availableQty}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              {quantityNum > availableQty && (
                <p className="text-xs text-destructive">
                  Cannot exceed available quantity ({availableQty})
                </p>
              )}
            </div>
          )}

          {/* Expected Return Date */}
          <div className="space-y-2">
            <Label>Expected Return Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expectedReturnDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expectedReturnDate ? format(expectedReturnDate, "PPP") : "No return date set"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expectedReturnDate}
                  onSelect={setExpectedReturnDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
                <div className="p-2 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setExpectedReturnDate(undefined)}
                  >
                    Clear date
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Optional. Alerts will appear if the item is not returned by this date.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Purpose, location, or special instructions..."
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
                <LogOut className="h-4 w-4 mr-2" />
                Check Out
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
