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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, LogIn, LogOut } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { checkOutSchema, checkInSchema } from "@/lib/validation";
import { z } from "zod";

interface CheckInOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: {
    id: number;
    assetTag: string;
    name: string;
    status: string;
    custodian?: string;
  } | null;
  onSuccess?: () => void;
}

const mockStaff = [
  "Sarah Martinez",
  "James Wilson",
  "Maria Garcia",
  "Robert Chen",
  "Lisa Wong",
  "Michael Brown",
  "Emma Davis",
];

export const CheckInOutDialog = ({ open, onOpenChange, equipment, onSuccess }: CheckInOutDialogProps) => {
  const [selectedStaff, setSelectedStaff] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [condition, setCondition] = useState("good");

  if (!equipment) return null;

  const isCheckOut = equipment.status === "available";
  const actionText = isCheckOut ? "Check Out" : "Check In";
  const actionIcon = isCheckOut ? LogOut : LogIn;
  const ActionIcon = actionIcon;

  const handleSubmit = () => {
    try {
      if (isCheckOut) {
        // Validate check-out data
        checkOutSchema.parse({
          equipmentId: equipment.id.toString(),
          custodian: selectedStaff,
          purpose,
          dueDate: dueDate?.toISOString(),
          location,
          notes,
        });
      } else {
        // Validate check-in data
        checkInSchema.parse({
          equipmentId: equipment.id.toString(),
          condition,
          location,
          notes,
        });
      }

      // Simulate API call
      setTimeout(() => {
        if (isCheckOut) {
          toast.success(`${equipment.name} checked out to ${selectedStaff}`, {
            description: `Asset: ${equipment.assetTag} • Due: ${dueDate ? format(dueDate, "PP") : "N/A"}`,
          });
        } else {
          toast.success(`${equipment.name} checked in successfully`, {
            description: `Asset: ${equipment.assetTag} • Returned in good condition`,
          });
        }
        
        // Reset form
        setSelectedStaff("");
        setDueDate(undefined);
        setPurpose("");
        setNotes("");
        setLocation("");
        setCondition("good");
        
        onOpenChange(false);
        onSuccess?.();
      }, 500);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ActionIcon className="h-5 w-5 text-primary" />
            {actionText} Asset
          </DialogTitle>
          <DialogDescription>
            {isCheckOut
              ? "Record who is taking this item and when it's expected back"
              : "Confirm the item return and record its condition"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Equipment Info */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-sm font-medium">{equipment.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{equipment.assetTag}</p>
            {equipment.custodian && equipment.custodian !== "—" && (
              <p className="text-xs text-muted-foreground">Current Custodian: {equipment.custodian}</p>
            )}
          </div>

          {isCheckOut ? (
            <>
              {/* Check Out Form */}
              <div className="space-y-2">
                <Label htmlFor="staff">Custodian *</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger id="staff">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockStaff.map((staff) => (
                      <SelectItem key={staff} value={staff}>
                        {staff}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Expected Return Date *</Label>
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

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Input
                  id="purpose"
                  placeholder="e.g., Field deployment, Training exercise"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Deployment Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Site A, Training Center"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              {/* Check In Form */}
              <div className="space-y-2">
                <Label htmlFor="condition">Item Condition *</Label>
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

              <div className="space-y-2">
                <Label htmlFor="returned-location">Return Location *</Label>
                <Input
                  id="returned-location"
                  placeholder="e.g., Section A-12"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder={
                isCheckOut
                  ? "Any special instructions or notes..."
                  : "Any damage, issues, or service needs..."
              }
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
          <Button onClick={handleSubmit}>
            <ActionIcon className="h-4 w-4 mr-2" />
            {actionText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
