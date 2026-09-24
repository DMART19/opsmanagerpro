import { useState } from "react";
import { Plus, FileText, Download, Calendar as CalendarIconComp, CheckCircle, Clock, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const mockAudits = [
  {
    id: 1,
    section: "A",
    status: "in-progress",
    progress: 65,
    startDate: "2025-11-08",
    assignedTo: "John Martinez",
    totalItems: 120,
    scannedItems: 78,
  },
  {
    id: 2,
    section: "B",
    status: "scheduled",
    progress: 0,
    startDate: "2025-11-10",
    assignedTo: "Sarah Chen",
    totalItems: 95,
    scannedItems: 0,
  },
  {
    id: 3,
    section: "C",
    status: "completed",
    progress: 100,
    startDate: "2025-11-01",
    completedDate: "2025-11-03",
    assignedTo: "Michael Johnson",
    totalItems: 145,
    scannedItems: 145,
  },
  {
    id: 4,
    section: "D",
    status: "completed",
    progress: 100,
    startDate: "2025-10-28",
    completedDate: "2025-10-30",
    assignedTo: "Emily Rodriguez",
    totalItems: 68,
    scannedItems: 68,
  },
];

const mockInspectors = [
  { id: 1, name: "John Martinez" },
  { id: 2, name: "Sarah Chen" },
  { id: 3, name: "Michael Johnson" },
  { id: 4, name: "Emily Rodriguez" },
  { id: 5, name: "David Park" },
];

const statusConfig = {
  "in-progress": {
    label: "In Progress",
    color: "bg-primary/10 text-primary border-primary/20",
    icon: Clock,
  },
  scheduled: {
    label: "Scheduled",
    color: "bg-accent/10 text-accent-foreground border-accent/20",
    icon: CalendarIconComp,
  },
  completed: {
    label: "Completed",
    color: "bg-success/10 text-success border-success/20",
    icon: CheckCircle,
  },
};

export const Audits = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedInspector, setSelectedInspector] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const handleStartAudit = () => {
    if (selectedSections.length === 0) {
      toast.error("Please select at least one warehouse section");
      return;
    }
    if (!selectedInspector) {
      toast.error("Please assign an inspector");
      return;
    }
    if (!dueDate) {
      toast.error("Please select a due date");
      return;
    }
    
    toast.success(`Audit started for Section(s): ${selectedSections.join(", ")}`);
    setDialogOpen(false);
    setSelectedSections([]);
    setSelectedInspector("");
    setDueDate(undefined);
  };

  const handleExportReport = (auditId: number) => {
    toast.success("Audit report exported successfully");
  };

  const toggleSection = (section: string) => {
    setSelectedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const filteredAudits = activeFilter === "all" 
    ? mockAudits 
    : mockAudits.filter((audit) => audit.status === activeFilter);

  const sections = [
    { value: "A", label: "Section A - Electronics" },
    { value: "B", label: "Section B - Furniture" },
    { value: "C", label: "Section C - Office Equipment" },
    { value: "D", label: "Section D - AV Equipment" },
    { value: "E", label: "Section E - Supplies" },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Audit Management</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Track and manage warehouse audits and inspections
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  Start New Audit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Start New Audit</DialogTitle>
                  <DialogDescription>
                    Select section(s), assign inspector, and set due date
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Section Selection */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">
                      Warehouse Sections *
                    </Label>
                    <div className="space-y-2">
                      {sections.map((section) => (
                        <div key={section.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`section-${section.value}`}
                            checked={selectedSections.includes(section.value)}
                            onCheckedChange={() => toggleSection(section.value)}
                          />
                          <Label
                            htmlFor={`section-${section.value}`}
                            className="text-sm cursor-pointer"
                          >
                            {section.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Inspector Assignment */}
                  <div>
                    <Label htmlFor="inspector" className="text-base font-semibold mb-2 block">
                      Assign Inspector *
                    </Label>
                    <Select value={selectedInspector} onValueChange={setSelectedInspector}>
                      <SelectTrigger id="inspector">
                        <SelectValue placeholder="Select inspector..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mockInspectors.map((inspector) => (
                          <SelectItem key={inspector.id} value={inspector.id.toString()}>
                            {inspector.name}
                          </SelectItem>
                        ))}
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
                  <Button onClick={handleStartAudit} className="flex-1">
                    Start Audit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Status Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={activeFilter === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setActiveFilter("all")}
            >
              All
            </Badge>
            <Badge
              variant={activeFilter === "in-progress" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setActiveFilter("in-progress")}
            >
              In Progress
            </Badge>
            <Badge
              variant={activeFilter === "scheduled" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setActiveFilter("scheduled")}
            >
              Scheduled
            </Badge>
            <Badge
              variant={activeFilter === "completed" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setActiveFilter("completed")}
            >
              Completed
            </Badge>
          </div>
        </div>
      </Card>

      {/* Audits Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredAudits.map((audit) => {
          const StatusIcon = statusConfig[audit.status].icon;
          return (
            <Card key={audit.id} className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    audit.status === "in-progress" ? "bg-primary/10" :
                    audit.status === "scheduled" ? "bg-accent/10" :
                    "bg-success/10"
                  }`}>
                    <FileText className={`h-5 w-5 ${
                      audit.status === "in-progress" ? "text-primary" :
                      audit.status === "scheduled" ? "text-accent-foreground" :
                      "text-success"
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-semibold">Section {audit.section} Audit</h4>
                    <p className="text-sm text-muted-foreground">
                      {audit.status === "completed" 
                        ? `Completed ${new Date(audit.completedDate!).toLocaleDateString()}`
                        : `Started ${new Date(audit.startDate).toLocaleDateString()}`
                      }
                    </p>
                  </div>
                </div>
                <Badge className={statusConfig[audit.status].color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig[audit.status].label}
                </Badge>
              </div>

              <div className="space-y-3">
                {audit.status === "in-progress" && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">
                        {audit.scannedItems} / {audit.totalItems} items
                      </span>
                    </div>
                    <Progress value={audit.progress} className="h-2" />
                  </div>
                )}

                {audit.status !== "in-progress" && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Items:</span>
                    <span className="font-medium">{audit.totalItems}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {audit.status === "completed" ? "Audited by:" : "Assigned to:"}
                  </span>
                  <span className="font-medium">{audit.assignedTo}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                {audit.status === "in-progress" && (
                  <Button variant="default" size="sm" className="flex-1">
                    Continue Audit
                  </Button>
                )}
                {audit.status === "scheduled" && (
                  <>
                    <Button variant="outline" size="sm" className="flex-1">
                      Reschedule
                    </Button>
                    <Button size="sm" className="flex-1">
                      Start Now
                    </Button>
                  </>
                )}
                {audit.status === "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => handleExportReport(audit.id)}
                  >
                    <Download className="h-4 w-4" />
                    Export Report
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filteredAudits.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No audits found for this filter</p>
          </div>
        </Card>
      )}
    </div>
  );
};