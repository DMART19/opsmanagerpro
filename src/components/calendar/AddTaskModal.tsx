import { useState, useEffect, useMemo } from "react";
import { useTourMode } from "@/contexts/TourModeContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { 
  Calendar as CalendarIcon, 
  X, 
  Loader2, 
  Clock, 
  Users, 
  ExternalLink,
  Bell,
  Search,
  MapPin,
  FileText,
  Repeat,
  ChevronDown,
  Settings2,
  Check
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useTasks, Task } from "@/hooks/use-tasks";
import { useTaskAttributes, useTaskAttributeValues } from "@/hooks/use-task-attributes";
import { useEmployees } from "@/hooks/use-employees";
import { TaskAttributeFields } from "./TaskAttributeFields";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGuidanceContext } from "@/contexts/GuidanceContext";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledDate?: Date;
  editTask?: Task | null;
}

const taskTypes = [
  { value: "review", label: "Review", color: "bg-blue-500" },
  { value: "service", label: "Service", color: "bg-orange-500" },
  { value: "testing", label: "Testing", color: "bg-purple-500" },
  { value: "training", label: "Training", color: "bg-green-500" },
  { value: "transfer", label: "Transfer", color: "bg-red-500" },
  { value: "other", label: "Other", color: "bg-gray-500" },
];

const priorityOptions = [
  { value: "low", label: "Low", color: "bg-muted-foreground", textColor: "text-muted-foreground" },
  { value: "medium", label: "Medium", color: "bg-warning", textColor: "text-warning" },
  { value: "high", label: "High", color: "bg-destructive", textColor: "text-destructive" },
];

export const AddTaskModal = ({ open, onOpenChange, prefilledDate, editTask }: AddTaskModalProps) => {
  const { createTask, updateTask } = useTasks();
  const { attributes } = useTaskAttributes();
  const { values: existingAttrValues, upsertValues } = useTaskAttributeValues(editTask?.id);
  const { employees, loading: employeesLoading } = useEmployees();
  const { isTourMode } = useTourMode();
  const guidance = useGuidanceContext();
  const isEditMode = !!editTask;
  const isMobile = useIsMobile();
  const isOnboarding = guidance.isOnboarding && guidance.activeRequirement?.id === "has_task";
  
  // Core fields
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState<string>("");
  const [priority, setPriority] = useState<string>("medium");
  const [startDate, setStartDate] = useState<Date | undefined>(prefilledDate || new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Time toggle
  const [showTime, setShowTime] = useState(false);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  
  // Team assignment
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  
  // Alerts
  const [alertOnDue, setAlertOnDue] = useState(true);
  const [alertIfOverdue, setAlertIfOverdue] = useState(true);
  const [alertDaysBefore, setAlertDaysBefore] = useState<number | null>(null);
  const [alertAtStart, setAlertAtStart] = useState(false);
  
  // Notes & Location
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState<string>("");
  
  // Recurrence
  const [recurrenceType, setRecurrenceType] = useState<string>("none");
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>(undefined);
  
  // Custom attributes
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});

  // Progressive disclosure
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);

  // Track if we've already populated the form for this editTask
  const [populatedTaskId, setPopulatedTaskId] = useState<string | null>(null);

  // Populate form when editing - only run once per task
  useEffect(() => {
    if (editTask && populatedTaskId === editTask.id) {
      return;
    }
    
    if (editTask) {
      setTitle(editTask.title || "");
      setNotes(editTask.description || "");
      setStartDate(editTask.start_date ? parseISO(editTask.start_date) : undefined);
      setEndDate(editTask.end_date ? parseISO(editTask.end_date) : undefined);
      setStartTime(editTask.start_time || "");
      setEndTime(editTask.end_time || "");
      setSelectedEmployees(editTask.assigned_to || []);
      setTaskType(editTask.task_type || "");
      setPriority(editTask.priority || "medium");
      setLocation(editTask.location || "");
      setRecurrenceType(editTask.recurrence_type || "none");
      setRecurrenceInterval(editTask.recurrence_interval || 1);
      setRecurrenceEndDate(editTask.recurrence_end_date ? parseISO(editTask.recurrence_end_date) : undefined);
      if (editTask.start_time || editTask.end_time) {
        setShowTime(true);
      } else {
        setShowTime(false);
      }
      if (editTask.reminder_enabled) {
        setAlertOnDue(true);
        setAlertIfOverdue(true);
      }
      // Auto-expand more options in edit mode if advanced fields have data
      const hasAdvancedData = editTask.task_type || editTask.end_date || editTask.start_time || 
        editTask.end_time || (editTask.recurrence_type && editTask.recurrence_type !== "none") ||
        editTask.priority !== "medium" || (editTask.assigned_to && editTask.assigned_to.length > 0) ||
        editTask.description || editTask.location;
      if (hasAdvancedData) {
        setMoreOptionsOpen(true);
      }
      setPopulatedTaskId(editTask.id);
    } else if (prefilledDate) {
      setStartDate(prefilledDate);
      setEndDate(undefined);
      setPopulatedTaskId(null);
    } else {
      // Default: today
      setStartDate(new Date());
      setEndDate(undefined);
      setPopulatedTaskId(null);
    }
  }, [editTask?.id, prefilledDate]);

  // Populate attribute values when editing
  const [populatedAttrTaskId, setPopulatedAttrTaskId] = useState<string | null>(null);
  
  useEffect(() => {
    if (editTask && existingAttrValues.length > 0 && populatedAttrTaskId !== editTask.id) {
      const valuesMap: Record<string, string> = {};
      existingAttrValues.forEach((v) => {
        valuesMap[v.attribute_id] = v.value || "";
      });
      setAttributeValues(valuesMap);
      setPopulatedAttrTaskId(editTask.id);
    } else if (!editTask) {
      setPopulatedAttrTaskId(null);
    }
  }, [editTask?.id, existingAttrValues]);

  const resetForm = () => {
    setTitle("");
    setNotes("");
    setStartDate(new Date());
    setEndDate(undefined);
    setStartTime("");
    setEndTime("");
    setShowTime(false);
    setSelectedEmployees([]);
    setTaskType("");
    setPriority("medium");
    setLocation("");
    setRecurrenceType("none");
    setRecurrenceInterval(1);
    setRecurrenceEndDate(undefined);
    setAttributeValues({});
    setAlertOnDue(true);
    setAlertIfOverdue(true);
    setAlertDaysBefore(null);
    setAlertAtStart(false);
    setEmployeeSearch("");
    setMoreOptionsOpen(false);
    setPopulatedTaskId(null);
    setPopulatedAttrTaskId(null);
  };

  const handleAttributeChange = (attributeId: string, value: string) => {
    setAttributeValues((prev) => ({ ...prev, [attributeId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    // Auto-default type to "other" (General) if not selected
    const resolvedType = taskType || "other";
    const resolvedDate = startDate || new Date();

    // Validate required custom attributes
    const missingRequired = attributes.filter(
      (attr) => attr.required && !attributeValues[attr.id]?.trim()
    );
    if (missingRequired.length > 0) {
      toast({
        title: "Missing required field",
        description: `Please fill in "${missingRequired[0].name}"`,
        variant: "destructive",
      });
      return;
    }

    const reminderEnabled = alertOnDue || alertIfOverdue || alertDaysBefore !== null || alertAtStart;

    try {
      let taskId = editTask?.id;

      if (isEditMode && editTask) {
        await updateTask.mutateAsync({
          id: editTask.id,
          title: title.trim(),
          description: notes.trim() || null,
          task_type: resolvedType,
          priority: priority || "medium",
          start_date: format(resolvedDate, "yyyy-MM-dd"),
          end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
          start_time: showTime && startTime ? startTime : null,
          end_time: showTime && endTime ? endTime : null,
          assigned_to: selectedEmployees.length > 0 ? selectedEmployees : null,
          location: location || null,
          reminder_enabled: reminderEnabled,
          recurrence_type: recurrenceType,
          recurrence_interval: recurrenceInterval,
          recurrence_end_date: recurrenceEndDate ? format(recurrenceEndDate, "yyyy-MM-dd") : null,
        });
      } else {
        const result = await createTask.mutateAsync({
          title: title.trim(),
          description: notes.trim() || undefined,
          task_type: resolvedType,
          priority: priority || "medium",
          status: "pending",
          start_date: format(resolvedDate, "yyyy-MM-dd"),
          end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
          start_time: showTime && startTime ? startTime : undefined,
          end_time: showTime && endTime ? endTime : undefined,
          assigned_to: selectedEmployees.length > 0 ? selectedEmployees : undefined,
          location: location || undefined,
          reminder_enabled: reminderEnabled,
          recurrence_type: recurrenceType !== "none" ? recurrenceType : undefined,
          recurrence_interval: recurrenceType !== "none" ? recurrenceInterval : undefined,
          recurrence_end_date: recurrenceType !== "none" && recurrenceEndDate ? format(recurrenceEndDate, "yyyy-MM-dd") : undefined,
        });
        taskId = result?.id;
      }

      // Save custom attribute values
      if (taskId && Object.keys(attributeValues).length > 0) {
        const valuesToSave = Object.entries(attributeValues)
          .filter(([, value]) => value !== undefined)
          .map(([attributeId, value]) => ({
            task_id: taskId!,
            attribute_id: attributeId,
            value: value || null,
          }));

        if (valuesToSave.length > 0) {
          await upsertValues.mutateAsync(valuesToSave);
        }
      }

      if (isTourMode) {
        const { showDemoSaveToast } = await import("@/lib/demo-toast");
        showDemoSaveToast(isEditMode ? "Task updated" : "Task added.");
      } else {
        toast({
          title: isEditMode ? "Task updated" : "Task added.",
          description: `"${title}"`,
        });
      }

      onOpenChange(false);
      resetForm();
      if (!isEditMode) guidance.recordCompletion("has_task");
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const toggleEmployee = (employee: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employee) ? prev.filter((e) => e !== employee) : [...prev, employee]
    );
  };

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const search = employeeSearch.toLowerCase();
    return employees.filter(emp => 
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(search) ||
      emp.position?.toLowerCase().includes(search)
    );
  }, [employees, employeeSearch]);

  const isPending = createTask.isPending || updateTask.isPending;

  // Count how many "more options" have been configured
  const moreOptionsCount = [
    taskType,
    priority !== "medium",
    endDate,
    showTime,
    recurrenceType !== "none",
    selectedEmployees.length > 0,
    notes,
    location,
  ].filter(Boolean).length;

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className={`flex-1 min-h-0 overflow-y-auto ${isMobile ? "-mx-6 px-6" : "-mx-2 px-2"}`}>
        <div className="space-y-4 pb-6 px-1">
          
          {/* === PRIMARY: Title (auto-focused) === */}
          <div className="space-y-2">
            <Input 
              id="title" 
              placeholder="What needs to be done?" 
              className="h-12 text-base font-medium"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* === PRIMARY: Due Date — inline tappable row === */}
          <Popover open={dueDatePopoverOpen} onOpenChange={setDueDatePopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center gap-3 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors text-left min-h-[44px]"
              >
                <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">Due</span>
                <span className="text-sm font-medium ml-auto">
                  {startDate ? format(startDate, "MMM d, yyyy") : "Today"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => {
                  setStartDate(d || new Date());
                  setDueDatePopoverOpen(false);
                }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* === COLLAPSED: More Options === */}
          <Collapsible open={moreOptionsOpen} onOpenChange={setMoreOptionsOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed hover:bg-muted/30 transition-colors text-left min-h-[44px]"
              >
                <Settings2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  More options
                  {moreOptionsCount > 0 && (
                    <span className="ml-1.5 text-xs text-primary font-medium">
                      ({moreOptionsCount} set)
                    </span>
                  )}
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground ml-auto shrink-0 transition-transform duration-200",
                  moreOptionsOpen && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <div className="space-y-4 pt-3">

                {/* Type & Priority */}
                <div className={cn("gap-3", isMobile ? "space-y-3" : "grid grid-cols-2")}>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Type</Label>
                    <Select value={taskType} onValueChange={setTaskType}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="General" />
                      </SelectTrigger>
                      <SelectContent>
                        {taskTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${type.color}`} />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className={cn(
                        "h-11",
                        priority === "high" && "border-destructive/50 bg-destructive/5"
                      )}>
                        <SelectValue placeholder="Medium" />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                              <span className={opt.value === "high" ? "font-medium" : ""}>
                                {opt.label}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* End Date — inline tappable row */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors text-left min-h-[44px]"
                    >
                      <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground">End date</span>
                      <span className="text-sm font-medium ml-auto">
                        {endDate ? format(endDate, "MMM d, yyyy") : "None"}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex flex-col">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className="pointer-events-auto"
                        disabled={(date) => startDate ? date < startDate : false}
                      />
                      {endDate && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mx-3 mb-3"
                          onClick={() => setEndDate(undefined)}
                        >
                          Clear end date
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Time — inline tappable row */}
                <button
                  type="button"
                  className="w-full flex items-center gap-3 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors text-left min-h-[44px]"
                  onClick={() => setShowTime(!showTime)}
                >
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Time</span>
                  <span className="text-sm font-medium ml-auto">
                    {showTime && startTime ? startTime : "None"}
                  </span>
                </button>

                {showTime && (
                  <div className={cn("gap-3 animate-in fade-in-0 duration-200", isMobile ? "space-y-3" : "grid grid-cols-2")}>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Start Time</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">End Time</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Repeat — inline tappable row */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors text-left min-h-[44px]"
                    >
                      <Repeat className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground">Repeat</span>
                      <span className="text-sm font-medium ml-auto">
                        {recurrenceType === "none" ? "None" : recurrenceType.charAt(0).toUpperCase() + recurrenceType.slice(1)}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="start">
                    <div className="space-y-3">
                      <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Does not repeat" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Does not repeat</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>

                      {recurrenceType !== "none" && (
                        <div className="space-y-3 animate-in fade-in-0 duration-200">
                          {recurrenceType === "custom" && (
                            <div className="space-y-2">
                              <Label className="text-sm text-muted-foreground">Every (days)</Label>
                              <Input
                                type="number"
                                min={1}
                                max={365}
                                value={recurrenceInterval}
                                onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                                className="h-11"
                              />
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Ends on</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal h-11",
                                    !recurrenceEndDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {recurrenceEndDate ? format(recurrenceEndDate, "MMM d, yyyy") : "No end date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={recurrenceEndDate}
                                  onSelect={setRecurrenceEndDate}
                                  initialFocus
                                  className="pointer-events-auto"
                                  disabled={(date) => startDate ? date < startDate : false}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Assign Team */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">Assign Team</Label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => window.open('/people', '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Manage
                    </Button>
                  </div>
                  
                  {selectedEmployees.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedEmployees.map((employee) => (
                        <Badge key={employee} variant="secondary" className="gap-1 py-1 px-2">
                          {employee}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => toggleEmployee(employee)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search team members..."
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        className="pl-10 h-10"
                      />
                    </div>
                    
                    <div className="max-h-32 overflow-y-auto border rounded-lg">
                      {employeesLoading ? (
                        <div className="p-3 space-y-2">
                          <Skeleton className="h-8 w-full" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                      ) : filteredEmployees.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-muted-foreground">
                            {employees.length === 0 ? "No team members yet" : "No matches found"}
                          </p>
                        </div>
                      ) : (
                        filteredEmployees.slice(0, 6).map((emp) => {
                          const fullName = `${emp.first_name} ${emp.last_name}`;
                          const isSelected = selectedEmployees.includes(fullName);
                          return (
                            <div
                              key={emp.id}
                              className={cn(
                                "flex items-center justify-between p-2.5 cursor-pointer transition-colors min-h-[44px]",
                                isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                              )}
                              onClick={() => toggleEmployee(fullName)}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                  isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input"
                                )}>
                                  {isSelected && <Check className="h-3 w-3" />}
                                </div>
                                <span className="text-sm">{fullName}</span>
                                {emp.position && (
                                  <span className="text-xs text-muted-foreground">• {emp.position}</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Alerts & Reminders */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Alerts & Reminders</Label>
                  </div>
                  
                  <div className="space-y-2 p-4 border rounded-xl bg-muted/20">
                    <div className="flex items-center gap-3 min-h-[44px]">
                      <Checkbox 
                        id="alert-due" 
                        checked={alertOnDue} 
                        onCheckedChange={(checked) => setAlertOnDue(checked === true)}
                      />
                      <Label htmlFor="alert-due" className="cursor-pointer font-normal text-sm">
                        Alert on due date
                      </Label>
                    </div>
                    
                    <div className="flex items-center gap-3 min-h-[44px]">
                      <Checkbox 
                        id="alert-overdue" 
                        checked={alertIfOverdue} 
                        onCheckedChange={(checked) => setAlertIfOverdue(checked === true)}
                      />
                      <Label htmlFor="alert-overdue" className="cursor-pointer font-normal text-sm">
                        Alert if overdue
                      </Label>
                    </div>
                    
                    <div className="flex items-center gap-3 min-h-[44px]">
                      <Checkbox 
                        id="alert-before" 
                        checked={alertDaysBefore !== null} 
                        onCheckedChange={(checked) => setAlertDaysBefore(checked ? 1 : null)}
                      />
                      <Label htmlFor="alert-before" className="cursor-pointer font-normal text-sm flex-1">
                        Alert before due date
                      </Label>
                      {alertDaysBefore !== null && (
                        <Select 
                          value={String(alertDaysBefore)} 
                          onValueChange={(v) => setAlertDaysBefore(Number(v))}
                        >
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 day</SelectItem>
                            <SelectItem value="3">3 days</SelectItem>
                            <SelectItem value="7">7 days</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {showTime && (
                      <div className="flex items-center gap-3 min-h-[44px] animate-in fade-in-0 duration-200">
                        <Checkbox 
                          id="alert-start" 
                          checked={alertAtStart} 
                          onCheckedChange={(checked) => setAlertAtStart(checked === true)}
                        />
                        <Label htmlFor="alert-start" className="cursor-pointer font-normal text-sm">
                          Alert at start time
                        </Label>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground pt-2">
                      Alerts appear on the Dashboard and auto-resolve when completed
                    </p>
                  </div>
                </div>

                {/* Notes & Location */}
                <div className="space-y-4 pt-1">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="notes" className="text-sm">Notes</Label>
                    </div>
                    <Textarea
                      id="notes"
                      placeholder="Add instructions or context..."
                      className="min-h-[80px] resize-none"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="location" className="text-sm">Location</Label>
                    </div>
                    <Input
                      id="location"
                      placeholder="e.g., Main Office, Remote Site"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Footer Actions */}
      <div className={`flex gap-3 pt-4 border-t bg-background ${isMobile ? "flex-col pb-2" : "justify-end"}`}>
        <Button 
          type="submit" 
          disabled={isPending || !title.trim()}
          className={`h-12 ${isMobile ? "order-1" : ""}`}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditMode ? "Updating..." : "Saving..."}
            </>
          ) : (
            isEditMode ? "Update Task" : "Save Task"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
          className={`h-12 ${isMobile ? "order-2" : ""}`}
        >
          Cancel
        </Button>
      </div>
    </form>
  );

  // Mobile: Use Sheet (bottom drawer)
  if (isMobile) {
    if (!open) return null;
    return (
      <Sheet open={open} onOpenChange={(isOpen) => {
        if (!isOpen) setTimeout(() => resetForm(), 150);
        onOpenChange(isOpen);
      }}>
        <SheetContent 
          side="bottom" 
          className="h-[92vh] flex flex-col rounded-t-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="text-left pb-3 shrink-0">
            <SheetTitle className="text-xl">
              {isEditMode ? "Edit Event" : isOnboarding ? "Add your first task" : "New Event"}
            </SheetTitle>
            <SheetDescription className="text-sm">
              {isEditMode ? "Update event details" : isOnboarding ? "Start simple — you can add details later" : "Type a title and save — or expand for more options."}
            </SheetDescription>
          </SheetHeader>
          {formContent}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use Dialog
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) setTimeout(() => resetForm(), 150);
      onOpenChange(isOpen);
    }}>
      <DialogContent 
        className="max-w-lg max-h-[85vh] flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl">
            {isEditMode ? "Edit Event" : isOnboarding ? "Add your first task" : "New Event"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? "Update event details" : isOnboarding ? "Start simple — you can add details later" : "Type a title and save — or expand for more options."}
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};
