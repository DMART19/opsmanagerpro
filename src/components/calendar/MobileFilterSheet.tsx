import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Filter, Search, X, Calendar, Flag, CheckCircle2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { taskTypeLabels, taskTypeColors, priorityLabels, priorityColors, statusLabels, statusColors } from "./types";

export interface CalendarFilters {
  type: string;
  priority: string;
  status: string;
  search: string;
}

interface MobileFilterSheetProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  activeFilterCount: number;
  priorityFilter?: string;
  onPriorityChange?: (priority: string) => void;
  statusFilter?: string;
  onStatusChange?: (status: string) => void;
}

export const MobileFilterSheet = ({
  searchQuery,
  onSearchChange,
  selectedFilter,
  onFilterChange,
  activeFilterCount,
  priorityFilter = "all",
  onPriorityChange,
  statusFilter = "all",
  onStatusChange,
}: MobileFilterSheetProps) => {
  const [open, setOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localType, setLocalType] = useState(selectedFilter);
  const [localPriority, setLocalPriority] = useState(priorityFilter);
  const [localStatus, setLocalStatus] = useState(statusFilter);

  const handleApply = () => {
    onSearchChange(localSearch);
    onFilterChange(localType);
    onPriorityChange?.(localPriority);
    onStatusChange?.(localStatus);
    setOpen(false);
  };

  const handleReset = () => {
    setLocalSearch("");
    setLocalType("all");
    setLocalPriority("all");
    setLocalStatus("all");
    onSearchChange("");
    onFilterChange("all");
    onPriorityChange?.("all");
    onStatusChange?.("all");
  };

  // Count active filters
  const totalActiveFilters = 
    (localSearch ? 1 : 0) + 
    (localType !== "all" ? 1 : 0) + 
    (localPriority !== "all" ? 1 : 0) + 
    (localStatus !== "all" ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 relative h-8 px-2.5">
          <Filter className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <Badge 
              variant="default" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-xl">
        <SheetHeader className="pr-14">
          <div className="flex items-center justify-between">
            <SheetTitle>Filter Calendar</SheetTitle>
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
              Reset All
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6 pb-24 overflow-y-auto">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              Search
            </label>
            <div className="relative">
              <Input
                placeholder="Search tasks, assignees, locations..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="h-12"
              />
              {localSearch && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setLocalSearch("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(taskTypeLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setLocalType(key)}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px]",
                    localType === key
                      ? key === "all"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : `${taskTypeColors[key as keyof typeof taskTypeColors]?.bg} text-white shadow-md`
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Flag className="h-4 w-4 text-muted-foreground" />
              Priority
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(priorityLabels).map(([key, label]) => {
                const isSelected = localPriority === key;
                const colorClass = key !== "all" ? priorityColors[key as keyof typeof priorityColors] : "";
                
                return (
                  <button
                    key={key}
                    onClick={() => setLocalPriority(key)}
                    className={cn(
                      "px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] border",
                      isSelected
                        ? key === "all"
                          ? "bg-primary text-primary-foreground shadow-md border-primary"
                          : `${colorClass} shadow-md`
                        : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusLabels).map(([key, label]) => {
                const isSelected = localStatus === key;
                const colorClass = key !== "all" ? statusColors[key as keyof typeof statusColors] : "";
                
                return (
                  <button
                    key={key}
                    onClick={() => setLocalStatus(key)}
                    className={cn(
                      "px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] border",
                      isSelected
                        ? key === "all"
                          ? "bg-primary text-primary-foreground shadow-md border-primary"
                          : `${colorClass} shadow-md`
                        : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Filters Summary */}
          {totalActiveFilters > 0 && (
            <div className="p-4 bg-muted/30 rounded-xl space-y-2">
              <p className="text-sm font-medium text-foreground">Active Filters ({totalActiveFilters})</p>
              <div className="flex flex-wrap gap-2">
                {localSearch && (
                  <Badge variant="secondary" className="gap-1">
                    Search: "{localSearch}"
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setLocalSearch("")} />
                  </Badge>
                )}
                {localType !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Type: {taskTypeLabels[localType]}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setLocalType("all")} />
                  </Badge>
                )}
                {localPriority !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Priority: {priorityLabels[localPriority]}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setLocalPriority("all")} />
                  </Badge>
                )}
                {localStatus !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {statusLabels[localStatus]}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setLocalStatus("all")} />
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Apply Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t safe-area-inset-bottom">
          <Button onClick={handleApply} className="w-full h-12 text-base gap-2">
            Apply Filters
            {totalActiveFilters > 0 && (
              <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
                {totalActiveFilters}
              </Badge>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};