import { useState } from "react";
import { Search, Scan, CheckCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";

const mockEmployees = [
  { id: 1, name: "John Martinez", certifications: ["Equipment", "Technology"] },
  { id: 2, name: "Sarah Chen", certifications: ["First Aid", "Safety"] },
  { id: 3, name: "Michael Johnson", certifications: ["Communications", "IT Systems"] },
  { id: 4, name: "Emily Rodriguez", certifications: ["First Aid", "Safety"] },
  { id: 5, name: "David Park", certifications: ["Equipment", "General"] },
];

export const CheckInOut = () => {
  const [assetTag, setAssetTag] = useState("");
  const [equipment, setEquipment] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"checkout" | "checkin">("checkout");

  const handleScan = () => {
    // Simulate scanning/searching for equipment
    if (assetTag) {
      setEquipment({
        assetTag: assetTag,
        name: "Portable Projector - Epson EB-1795F",
        status: "available",
        custodian: "—",
        condition: "excellent",
        section: "A",
        pallet: "A-12",
        requiredCertification: "Equipment",
      });
      toast.success("Asset found");
    }
  };

  const validateCertification = () => {
    if (!selectedEmployee || !equipment) return true;
    
    const employee = mockEmployees.find((e) => e.id.toString() === selectedEmployee);
    if (!employee) return false;
    
    return employee.certifications.includes(equipment.requiredCertification);
  };

  const handleCheckOut = () => {
    if (!selectedEmployee || !dueDate || !condition) {
      toast.error("Please fill all required fields");
      return;
    }
    
    if (!validateCertification()) {
      toast.error("Employee does not have required certification");
      return;
    }
    
    setActionType("checkout");
    setConfirmDialogOpen(true);
  };

  const handleCheckIn = () => {
    if (!condition) {
      toast.error("Please select equipment condition");
      return;
    }
    
    setActionType("checkin");
    setConfirmDialogOpen(true);
  };

  const confirmAction = () => {
    if (actionType === "checkout") {
      toast.success("Asset assigned successfully");
    } else {
      toast.success("Asset returned successfully");
    }
    
    // Reset form
    setAssetTag("");
    setEquipment(null);
    setSelectedEmployee("");
    setDueDate(undefined);
    setCondition("");
    setNotes("");
    setConfirmDialogOpen(false);
  };

  const certificationValid = validateCertification();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Search and Equipment Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Asset Lookup</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="assetTag">Asset Tag or Serial Number</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="assetTag"
                placeholder="EQ-2025-001 or scan barcode..."
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                className="flex-1 text-lg"
              />
              <Button onClick={handleScan} className="gap-2">
                <Scan className="h-4 w-4" />
                Scan
              </Button>
            </div>
          </div>

          {equipment && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-lg">{equipment.name}</h4>
                  <p className="text-sm text-muted-foreground font-mono">
                    {equipment.assetTag}
                  </p>
                </div>
                <Badge
                  className={
                    equipment.status === "available"
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-warning/10 text-warning border-warning/20"
                  }
                >
                  {equipment.status === "available" ? "Available" : "Checked Out"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Location:</span>
                  <p className="font-medium">
                    Section {equipment.section}, {equipment.pallet}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Condition:</span>
                  <p className="font-medium capitalize">{equipment.condition}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Current Custodian:</span>
                  <p className="font-medium">{equipment.custodian}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Skill Required:</span>
                  <p className="font-medium">{equipment.requiredCertification}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Right: Transaction Form */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>
        
        {equipment ? (
          <div className="space-y-4">
            {equipment.status === "available" && (
              <>
                <div>
                  <Label htmlFor="employee">Assign to Employee *</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger id="employee" className="mt-2">
                      <SelectValue placeholder="Select employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mockEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span>{emp.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {emp.certifications.join(", ")}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedEmployee && !certificationValid && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Team member lacks required skill
                    </div>
                  )}
                  {selectedEmployee && certificationValid && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-success">
                      <CheckCircle className="h-4 w-4" />
                      Skill verified
                    </div>
                  )}
                </div>

                <div>
                  <Label>Due Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-2",
                          !dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP") : "Select due date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="condition">Asset Condition *</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger id="condition" className="mt-2">
                  <SelectValue placeholder="Select condition..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor - Needs Attention</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              {equipment.status === "available" ? (
                <Button onClick={handleCheckOut} className="flex-1" size="lg">
                  Assign Asset
                </Button>
              ) : (
                <Button onClick={handleCheckIn} className="flex-1" size="lg">
                  Return Asset
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Search className="h-12 w-12 mb-4 opacity-50" />
            <p>Enter asset tag or scan an item to begin</p>
          </div>
        )}
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm {actionType === "checkout" ? "Check-Out" : "Check-In"}
            </DialogTitle>
            <DialogDescription>
              Please review the transaction details before confirming.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Equipment:</span>
              <span className="font-medium">{equipment?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Asset Tag:</span>
              <span className="font-mono">{equipment?.assetTag}</span>
            </div>
            {actionType === "checkout" && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Employee:</span>
                  <span className="font-medium">
                    {mockEmployees.find((e) => e.id.toString() === selectedEmployee)?.name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-medium">
                    {dueDate ? format(dueDate, "PPP") : "—"}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Condition:</span>
              <span className="font-medium capitalize">{condition}</span>
            </div>
            {notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">Notes:</span>
                <p className="mt-1 text-foreground">{notes}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAction}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
