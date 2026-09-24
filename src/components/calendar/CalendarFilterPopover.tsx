import { useState } from "react";
import { Filter, X, Flag, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { priorityLabels, statusLabels } from "./types";

interface CalendarFilterPopoverProps {
  priorityFilter: string;
  statusFilter: string;
  onPriorityChange: (priority: string) => void;
  onStatusChange: (status: string) => void;
}

export const CalendarFilterPopover = ({
  priorityFilter,
  statusFilter,
  onPriorityChange,
  onStatusChange,
}: CalendarFilterPopoverProps) => {
  const [open, setOpen] = useState(false);

  const activeFiltersCount =
    (priorityFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  const clearAllFilters = () => {
    onPriorityChange("all");
    onStatusChange("all");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 h-9 border-border/50",
            activeFiltersCount > 0 && "border-primary/30 bg-primary/5"
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 h-5 px-1.5 text-xs bg-primary/10 text-primary"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-4 pb-3 border-b flex items-center justify-between">
          <h4 className="font-semibold text-sm">Filters</h4>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearAllFilters}
            >
              Clear all
            </Button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Priority Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Flag className="h-3.5 w-3.5" />
              Priority
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(priorityLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => onPriorityChange(key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    priorityFilter === key
                      ? key === "high"
                        ? "bg-destructive/15 text-destructive"
                        : key === "medium"
                        ? "bg-warning/15 text-warning"
                        : key === "low"
                        ? "bg-success/15 text-success"
                        : "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Status
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(statusLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => onStatusChange(key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    statusFilter === key
                      ? key === "complete"
                        ? "bg-success/15 text-success"
                        : key === "in-progress"
                        ? "bg-primary/15 text-primary"
                        : key === "pending"
                        ? "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Active filter chips component
interface ActiveFilterChipsProps {
  priorityFilter: string;
  statusFilter: string;
  typeFilter: string;
  assigneeFilter?: string;
  onPriorityChange: (priority: string) => void;
  onStatusChange: (status: string) => void;
  onTypeChange: (type: string) => void;
  onAssigneeChange?: (assignee: string) => void;
}

export const ActiveFilterChips = ({
  priorityFilter,
  statusFilter,
  typeFilter,
  assigneeFilter = "all",
  onPriorityChange,
  onStatusChange,
  onTypeChange,
  onAssigneeChange,
}: ActiveFilterChipsProps) => {
  const hasActiveFilters =
    priorityFilter !== "all" || statusFilter !== "all" || typeFilter !== "all" || assigneeFilter !== "all";

  if (!hasActiveFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {typeFilter !== "all" && (
        <Badge
          variant="secondary"
          className="gap-1.5 cursor-pointer hover:bg-secondary/80 pr-1.5"
          onClick={() => onTypeChange("all")}
        >
          Type: {typeFilter}
          <X className="h-3 w-3" />
        </Badge>
      )}
      {priorityFilter !== "all" && (
        <Badge
          variant="secondary"
          className="gap-1.5 cursor-pointer hover:bg-secondary/80 pr-1.5"
          onClick={() => onPriorityChange("all")}
        >
          Priority: {priorityLabels[priorityFilter]}
          <X className="h-3 w-3" />
        </Badge>
      )}
      {statusFilter !== "all" && (
        <Badge
          variant="secondary"
          className="gap-1.5 cursor-pointer hover:bg-secondary/80 pr-1.5"
          onClick={() => onStatusChange("all")}
        >
          Status: {statusLabels[statusFilter]}
          <X className="h-3 w-3" />
        </Badge>
      )}
      {assigneeFilter !== "all" && (
        <Badge
          variant="secondary"
          className="gap-1.5 cursor-pointer hover:bg-secondary/80 pr-1.5"
          onClick={() => onAssigneeChange?.("all")}
        >
          Team: {assigneeFilter}
          <X className="h-3 w-3" />
        </Badge>
      )}
      <button
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => {
          onPriorityChange("all");
          onStatusChange("all");
          onTypeChange("all");
          onAssigneeChange?.("all");
        }}
      >
        Clear all
      </button>
    </div>
  );
};
