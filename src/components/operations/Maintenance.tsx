import { useState } from "react";
import { Wrench, Calendar as CalendarIconComp, User, Plus, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const mockWorkOrders = [
  {
    id: 1,
    equipment: "Conference Projector - Epson EB-1795F",
    assetTag: "EQ-2025-001",
    status: "open",
    priority: "high",
    dueDate: "2025-11-10",
    assignedTech: "—",
    notes: "Quarterly service check due",
    type: "Preventive Service",
  },
  {
    id: 2,
    equipment: "Office Printer - HP LaserJet",
    assetTag: "EQ-2025-002",
    status: "in-progress",
    priority: "medium",
    dueDate: "2025-11-12",
    assignedTech: "Carlos Rivera",
    notes: "Replace toner and clean rollers",
    type: "Repair",
  },
  {
    id: 3,
    equipment: "Video Conference Camera",
    assetTag: "EQ-2025-003",
    status: "in-progress",
    priority: "high",
    dueDate: "2025-11-09",
    assignedTech: "Maria Santos",
    notes: "Firmware update and testing required",
    type: "Testing",
  },
  {
    id: 4,
    equipment: "First Aid Supply Kit - Type A",
    assetTag: "EQ-2025-004",
    status: "closed",
    priority: "low",
    dueDate: "2025-11-05",
    completedDate: "2025-11-05",
    assignedTech: "Jennifer Lee",
    notes: "Restocked expired supplies",
    type: "Inspection",
  },
  {
    id: 5,
    equipment: "Portable Display Stand",
    assetTag: "EQ-2025-005",
    status: "open",
    priority: "low",
    dueDate: "2025-11-15",
    assignedTech: "—",
    notes: "Annual review due",
    type: "Inspection",
  },
];

const mockEquipment = [
  { id: 1, name: "Conference Projector - Epson EB-1795F", assetTag: "EQ-2025-001" },
  { id: 2, name: "Office Printer - HP LaserJet", assetTag: "EQ-2025-002" },
  { id: 3, name: "Video Conference Camera", assetTag: "EQ-2025-003" },
  { id: 4, name: "First Aid Supply Kit - Type A", assetTag: "EQ-2025-004" },
  { id: 5, name: "Portable Display Stand", assetTag: "EQ-2025-005" },
];

const mockTechnicians = [
  { id: 1, name: "Carlos Rivera" },
  { id: 2, name: "Maria Santos" },
  { id: 3, name: "Jennifer Lee" },
  { id: 4, name: "Robert Kim" },
  { id: 5, name: "Angela Torres" },
];

const statusConfig = {
  open: { label: "Open", color: "bg-warning/10 text-warning border-warning/20" },
  "in-progress": { label: "In Progress", color: "bg-primary/10 text-primary border-primary/20" },
  closed: { label: "Closed", color: "bg-success/10 text-success border-success/20" },
};

const priorityConfig = {
  high: { label: "High", color: "text-destructive" },
  medium: { label: "Medium", color: "text-warning" },
  low: { label: "Low", color: "text-muted-foreground" },
};

export const Maintenance = () => {
  const [filter, setFilter] = useState<"all" | "open" | "in-progress" | "closed">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState("");
  const [workOrderType, setWorkOrderType] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTech, setAssignedTech] = useState("");
  const [priority, setPriority] = useState("");
  const [dueDate, setDueDate] = useState<Date>();

  const handleCreateWorkOrder = () => {
    if (!selectedEquipment) {
      toast.error("Please select equipment");
      return;
    }
    if (!workOrderType) {
      toast.error("Please select work order type");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }
    if (!priority) {
      toast.error("Please select priority");
      return;
    }
    if (!dueDate) {
      toast.error("Please select a due date");
      return;
    }

    const equipment = mockEquipment.find((e) => e.id.toString() === selectedEquipment);
    toast.success(`Work order created for ${equipment?.name}`);
    
    // Reset form
    setDialogOpen(false);
    setSelectedEquipment("");
    setWorkOrderType("");
    setDescription("");
    setAssignedTech("");
    setPriority("");
    setDueDate(undefined);
  };

  const filteredOrders =
    filter === "all"
      ? mockWorkOrders
      : mockWorkOrders.filter((order) => order.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Work Orders</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Manage service and testing schedules
              </p>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  New Work Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Work Order</DialogTitle>
                  <DialogDescription>
                    Fill out the form to create a new service work order
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Equipment Selection */}
                  <div>
                    <Label htmlFor="equipment" className="text-base font-semibold mb-2 block">
                      Equipment *
                    </Label>
                    <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                      <SelectTrigger id="equipment">
                        <SelectValue placeholder="Select equipment..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mockEquipment.map((equipment) => (
                          <SelectItem key={equipment.id} value={equipment.id.toString()}>
                            <div className="flex flex-col">
                              <span>{equipment.name}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {equipment.assetTag}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Work Order Type */}
                  <div>
                    <Label htmlFor="type" className="text-base font-semibold mb-2 block">
                      Type *
                    </Label>
                    <Select value={workOrderType} onValueChange={setWorkOrderType}>
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preventive">Preventive Service</SelectItem>
                        <SelectItem value="repair">Repair</SelectItem>
                        <SelectItem value="testing">Testing</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description" className="text-base font-semibold mb-2 block">
                      Description *
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the work to be performed..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Assign Technician */}
                  <div>
                    <Label htmlFor="tech" className="text-base font-semibold mb-2 block">
                      Assign Technician (Optional)
                    </Label>
                    <Select value={assignedTech} onValueChange={setAssignedTech}>
                      <SelectTrigger id="tech">
                        <SelectValue placeholder="Select technician..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mockTechnicians.map((tech) => (
                          <SelectItem key={tech.id} value={tech.id.toString()}>
                            {tech.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority */}
                  <div>
                    <Label htmlFor="priority" className="text-base font-semibold mb-2 block">
                      Priority *
                    </Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="Select priority..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="low">Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Due Date */}
                  <div>
                    <Label className="text-base font-semibold mb-2 block">
                      Due Date *
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIconComp className="mr-2 h-4 w-4" />
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
                </div>

                <DialogFooter className="flex-row gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateWorkOrder} className="flex-1">
                    Create Work Order
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Status Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filter === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilter("all")}
            >
              All
            </Badge>
            <Badge
              variant={filter === "open" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilter("open")}
            >
              Open
            </Badge>
            <Badge
              variant={filter === "in-progress" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilter("in-progress")}
            >
              In Progress
            </Badge>
            <Badge
              variant={filter === "closed" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilter("closed")}
            >
              Closed
            </Badge>
          </div>
        </div>
      </Card>

      {/* Work Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
              {/* Left: Equipment Info */}
              <div className="flex items-start gap-3 sm:gap-4 flex-1">
                <div className="p-2.5 sm:p-3 bg-primary/10 rounded-xl flex-shrink-0">
                  <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base sm:text-lg leading-tight">
                        {order.equipment}
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground font-mono mt-1">
                        {order.assetTag}
                      </p>
                    </div>
                    <Badge className={statusConfig[order.status].color}>
                      {statusConfig[order.status].label}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {order.type}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${priorityConfig[order.priority].color}`}
                    >
                      {priorityConfig[order.priority].label} Priority
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">{order.notes}</p>
                </div>
              </div>

              {/* Right: Assignment & Dates */}
              <div className="lg:w-80 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIconComp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Due:</span>
                  <span className="font-medium">
                    {new Date(order.dueDate).toLocaleDateString()}
                  </span>
                </div>

                {order.completedDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIconComp className="h-4 w-4 text-success flex-shrink-0" />
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="font-medium text-success">
                      {new Date(order.completedDate).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Assigned:</span>
                  <span className="font-medium">
                    {order.assignedTech === "—" ? "Unassigned" : order.assignedTech}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  {order.status !== "closed" && (
                    <>
                      {order.status === "open" && (
                        <Button size="sm" className="flex-1">
                          Assign Tech
                        </Button>
                      )}
                      {order.status === "in-progress" && (
                        <Button size="sm" variant="outline" className="flex-1">
                          Mark Complete
                        </Button>
                      )}
                    </>
                  )}
                  <Button size="sm" variant="ghost" className="gap-1">
                    <FileText className="h-4 w-4" />
                    Details
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No work orders found for this filter</p>
          </div>
        </Card>
      )}
    </div>
  );
};