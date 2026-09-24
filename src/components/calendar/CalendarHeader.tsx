import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Plus, Search, X, Calendar as CalendarIcon, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ViewType, taskTypeLabels, taskTypeColors, CalendarTask } from "./types";
import { GuidanceHighlight } from "@/components/guidance/GuidanceHighlight";
import { ViewSegmentedControl } from "./ViewSegmentedControl";
import { CalendarFilterPopover, ActiveFilterChips } from "./CalendarFilterPopover";
import { MonthYearPicker } from "./MonthYearPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CalendarHeaderProps {
  currentDate: Date;
  view: ViewType;
  selectedFilter: string;
  searchQuery: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: ViewType) => void;
  onFilterChange: (filter: string) => void;
  onSearchChange: (query: string) => void;
  onAddTask: () => void;
  isMobile: boolean;
  priorityFilter?: string;
  onPriorityChange?: (priority: string) => void;
  statusFilter?: string;
  onStatusChange?: (status: string) => void;
  assigneeFilter?: string;
  onAssigneeChange?: (assignee: string) => void;
  allTasks?: CalendarTask[];
  onDateChange?: (date: Date) => void;
}

export const CalendarHeader = ({
  currentDate,
  view,
  selectedFilter,
  searchQuery,
  onPrevious,
  onNext,
  onToday,
  onViewChange,
  onFilterChange,
  onSearchChange,
  onAddTask,
  isMobile,
  priorityFilter = "all",
  onPriorityChange,
  statusFilter = "all",
  onStatusChange,
  assigneeFilter = "all",
  onAssigneeChange,
  allTasks = [],
  onDateChange,
}: CalendarHeaderProps) => {
  // Derive unique assignee names from all tasks
  const uniqueAssignees = useMemo(() => {
    const names = new Set<string>();
    allTasks.forEach(t => t.assignees?.forEach(a => names.add(a)));
    return Array.from(names).sort();
  }, [allTasks]);
  const isToday = () => {
    const today = new Date();
    return (
      currentDate.getDate() === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const handleDateChange = (date: Date) => {
    if (onDateChange) {
      onDateChange(date);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Row: Navigation + View Switcher + Add */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left: Navigation */}
        <div className="flex items-center gap-3">
          {/* Nav arrows - grouped with subtle container */}
          <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevious}
              className="h-8 w-8 hover:bg-background transition-all duration-200 rounded-md active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              className="h-8 w-8 hover:bg-background transition-all duration-200 rounded-md active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month/Year - Now clickable with picker */}
          <MonthYearPicker
            currentDate={currentDate}
            onDateChange={handleDateChange}
          />

          {/* Today button - subtle with indicator when not on today */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToday}
            className={cn(
              "gap-1.5 transition-all duration-200",
              isToday()
                ? "text-muted-foreground/60"
                : "text-primary hover:text-primary hover:bg-primary/5"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            Today
            {!isToday() && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            )}
          </Button>
        </div>

        {/* Right: View Switcher + Add Button */}
        <div className="flex items-center gap-3">
          <ViewSegmentedControl
            view={view}
            onViewChange={onViewChange}
            isMobile={isMobile}
          />

          {!isMobile && (
            <GuidanceHighlight resolveKey="add_task_button">
              <Button 
                onClick={onAddTask} 
                className="gap-1.5 shadow-sm transition-all duration-200 active:scale-95"
                id="add_task_button"
              >
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            </GuidanceHighlight>
          )}
        </div>
      </div>

      {/* Search + Filters Row */}
      <div data-tour="calendar-actions" className="flex gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9 h-9 bg-muted/30 border-border/50 focus:bg-background transition-all duration-200"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 transition-all duration-200 hover:scale-110"
              onClick={() => onSearchChange("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Type Filter Pills - More subtle with smooth transitions */}
        <div className="flex items-center gap-1.5">
          {Object.entries(taskTypeLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => onFilterChange(key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                "active:scale-95",
                selectedFilter === key
                  ? key === "all"
                    ? "bg-foreground text-background shadow-sm"
                    : cn(
                        taskTypeColors[key as keyof typeof taskTypeColors]?.light, 
                        taskTypeColors[key as keyof typeof taskTypeColors]?.text,
                        "shadow-sm"
                      )
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Inline Team Member Filter */}
        <Select value={assigneeFilter} onValueChange={onAssigneeChange || (() => {})}>
          <SelectTrigger className={cn(
            "w-[200px] h-9 border-border/50 text-sm",
            assigneeFilter !== "all" && "border-primary/30 bg-primary/5"
          )}>
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Filter by Team Member" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Team Members</SelectItem>
            {uniqueAssignees.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filter Popover */}
        <CalendarFilterPopover
          priorityFilter={priorityFilter}
          statusFilter={statusFilter}
          onPriorityChange={onPriorityChange || (() => {})}
          onStatusChange={onStatusChange || (() => {})}
        />
      </div>

      {/* Active Filter Chips */}
      <ActiveFilterChips
        priorityFilter={priorityFilter}
        statusFilter={statusFilter}
        typeFilter={selectedFilter}
        assigneeFilter={assigneeFilter}
        onPriorityChange={onPriorityChange || (() => {})}
        onStatusChange={onStatusChange || (() => {})}
        onTypeChange={onFilterChange}
        onAssigneeChange={onAssigneeChange || (() => {})}
      />
    </div>
  );
};
