import { Button } from "@/components/ui/button";
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
import { Filter, ArrowUpDown, X } from "lucide-react";
import { ActivityHistoryFilters as FiltersType } from "./types";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface ActivityHistoryFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  employees: Employee[];
}

export const ActivityHistoryFilters = ({
  filters,
  onFiltersChange,
  employees,
}: ActivityHistoryFiltersProps) => {
  const hasActiveFilters =
    filters.actionType !== 'all' ||
    filters.employeeId !== null ||
    filters.status !== 'all';

  const clearFilters = () => {
    onFiltersChange({
      ...filters,
      actionType: 'all',
      employeeId: null,
      status: 'all',
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Sort Toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={() =>
          onFiltersChange({
            ...filters,
            sortOrder: filters.sortOrder === 'newest' ? 'oldest' : 'newest',
          })
        }
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        {filters.sortOrder === 'newest' ? 'Newest' : 'Oldest'}
      </Button>

      {/* Filter Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={hasActiveFilters ? "secondary" : "ghost"}
            size="sm"
            className="h-8 text-xs gap-1.5"
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
            {hasActiveFilters && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-medium">
                {[filters.actionType !== 'all', filters.employeeId !== null, filters.status !== 'all'].filter(Boolean).length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[240px] p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Filters</span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={clearFilters}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Action Type */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Action Type</label>
            <Select
              value={filters.actionType}
              onValueChange={(value: FiltersType['actionType']) =>
                onFiltersChange({ ...filters, actionType: value })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="checked_out">Checked out only</SelectItem>
                <SelectItem value="returned">Returned only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select
              value={filters.status}
              onValueChange={(value: FiltersType['status']) =>
                onFiltersChange({ ...filters, status: value })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Team Member */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Team Member</label>
            <Select
              value={filters.employeeId || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  employeeId: value === 'all' ? null : value,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
