import { useState, useMemo } from "react";
import { Filter, X, ChevronDown, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ASSETS_TOOLTIPS } from "@/lib/tooltip-content";
import { 
  useDynamicTeamFilters, 
  DynamicFilter, 
  DynamicFiltersState 
} from "@/hooks/use-dynamic-team-filters";

// Legacy interface for backwards compatibility
export interface EmployeeFiltersState {
  department: string;
  status: string;
  hireDateRange: string;
  complianceStatus: string;
  [key: string]: string; // Support dynamic filter keys
}

interface DynamicEmployeeFiltersProps {
  employees: any[];
  filterState: DynamicFiltersState;
  onFilterStateChange: (state: DynamicFiltersState) => void;
  className?: string;
}

/**
 * Dynamic Employee Filters Component
 * 
 * Filters are generated based on actual data:
 * - Only shows filters for fields that have data
 * - Custom attributes become filters automatically
 * - Filter types are auto-detected
 */
export const DynamicEmployeeFilters = ({
  employees,
  filterState,
  onFilterStateChange,
  className,
}: DynamicEmployeeFiltersProps) => {
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  
  const {
    primaryFilters,
    secondaryFilters,
    countActiveFilters,
  } = useDynamicTeamFilters({ employees });

  const updateFilter = (filterId: string, value: string | boolean | null) => {
    onFilterStateChange({ ...filterState, [filterId]: value });
  };

  const clearAllFilters = () => {
    const clearedState: DynamicFiltersState = {};
    [...primaryFilters, ...secondaryFilters].forEach((f) => {
      clearedState[f.id] = "all";
    });
    onFilterStateChange(clearedState);
  };

  const activeFilterCount = countActiveFilters(filterState);
  const secondaryActiveCount = secondaryFilters.filter(
    (f) => filterState[f.id] && filterState[f.id] !== "all"
  ).length;

  // Render a single filter based on its type
  const renderFilter = (filter: DynamicFilter, isInPopover = false) => {
    const value = filterState[filter.id];
    const width = isInPopover ? "w-full" : "w-[140px]";

    switch (filter.type) {
      case "select":
        return (
          <Select
            key={filter.id}
            value={value as string || "all"}
            onValueChange={(v) => updateFilter(filter.id, v)}
          >
            <SelectTrigger className={cn(width, "h-9 bg-background")}>
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All {filter.label}s</SelectItem>
              {filter.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "boolean":
        return (
          <div 
            key={filter.id}
            className={cn(
              "flex items-center gap-2 px-3 h-9 border rounded-md bg-background",
              isInPopover && "w-full justify-between"
            )}
          >
            <span className="text-sm">{filter.label}</span>
            <Switch
              checked={value === true || value === "true"}
              onCheckedChange={(checked) => updateFilter(filter.id, checked)}
            />
          </div>
        );

      case "text":
        return (
          <Input
            key={filter.id}
            placeholder={`Filter by ${filter.label}`}
            value={value as string || ""}
            onChange={(e) => updateFilter(filter.id, e.target.value || "all")}
            className={cn(width, "h-9")}
          />
        );

      default:
        return null;
    }
  };

  // Get active filter labels for display
  const getActiveFilterBadges = () => {
    const badges: { id: string; label: string; value: string }[] = [];
    
    [...primaryFilters, ...secondaryFilters].forEach((filter) => {
      const value = filterState[filter.id];
      if (value && value !== "all" && value !== "") {
        badges.push({
          id: filter.id,
          label: filter.label,
          value: typeof value === "boolean" ? (value ? "Yes" : "No") : String(value),
        });
      }
    });

    return badges;
  };

  const activeBadges = getActiveFilterBadges();

  // If no filters are available, don't render anything
  if (primaryFilters.length === 0 && secondaryFilters.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters:</span>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground">
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-sm">
              {ASSETS_TOOLTIPS.filters}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Primary Filters - Inline */}
        {primaryFilters.map((filter) => renderFilter(filter))}

        {/* More Filters Dropdown - only if secondary filters exist */}
        {secondaryFilters.length > 0 && (
          <Popover open={moreFiltersOpen} onOpenChange={setMoreFiltersOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "h-9 gap-1.5",
                  secondaryActiveCount > 0 && "border-primary/50 bg-primary/5"
                )}
              >
                More Filters
                {secondaryActiveCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {secondaryActiveCount}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4 bg-popover" align="start">
              <div className="space-y-4">
                {secondaryFilters.map((filter) => (
                  <div key={filter.id} className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      {filter.label}
                      {filter.isCustomAttribute && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          Custom
                        </Badge>
                      )}
                    </label>
                    {renderFilter(filter, true)}
                  </div>
                ))}

                {secondaryActiveCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      secondaryFilters.forEach((f) => updateFilter(f.id, "all"));
                    }}
                    className="w-full text-muted-foreground hover:text-foreground"
                  >
                    Clear Advanced Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-9 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeBadges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeBadges.map((badge) => (
            <Badge 
              key={badge.id}
              variant="secondary" 
              className="gap-1 bg-secondary text-secondary-foreground"
            >
              {badge.label}: {badge.value}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => updateFilter(badge.id, "all")}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// Legacy Component for Backwards Compatibility
// ==========================================

interface LegacyEmployeeFiltersProps {
  filters: EmployeeFiltersState;
  onFiltersChange: (filters: EmployeeFiltersState) => void;
  departments: { id: string; name: string }[];
  employees?: any[];
  className?: string;
}

/**
 * Legacy EmployeeFilters component
 * @deprecated Use DynamicEmployeeFilters instead
 */
export const EmployeeFilters = ({
  filters,
  onFiltersChange,
  departments,
  employees = [],
  className,
}: LegacyEmployeeFiltersProps) => {
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  
  // Use dynamic filters hook to check data availability
  const { primaryFilters: dynamicPrimaryFilters, secondaryFilters: dynamicSecondaryFilters } = 
    useDynamicTeamFilters({ employees });
  
  // Check if filters should be shown based on data
  const showCredentialFilter = dynamicPrimaryFilters.some(f => f.id === "credentialStatus") ||
    dynamicSecondaryFilters.some(f => f.id === "credentialStatus") ||
    employees.some(emp => emp.requirements_stats?.total > 0);
  
  const showHireDateFilter = employees.some(emp => emp.hire_date);

  const updateFilter = (key: keyof EmployeeFiltersState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      department: "all",
      status: "all",
      hireDateRange: "all",
      complianceStatus: "all",
    });
  };

  const hasActiveFilters =
    filters.department !== "all" ||
    filters.status !== "all" ||
    filters.hireDateRange !== "all" ||
    filters.complianceStatus !== "all";

  const hasAdvancedFilters =
    filters.hireDateRange !== "all" ||
    filters.complianceStatus !== "all";

  const advancedFilterCount = [
    filters.hireDateRange !== "all",
    filters.complianceStatus !== "all",
  ].filter(Boolean).length;

  const activeFilterCount = [
    filters.department !== "all",
    filters.status !== "all",
    filters.hireDateRange !== "all",
    filters.complianceStatus !== "all",
  ].filter(Boolean).length;

  // Only show department filter if departments exist
  const showDepartmentFilter = departments.length > 0;
  
  // Get unique status values from employees as {id, name} pairs
  const statusOptions = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach(emp => {
      if (emp.employee_status_id && emp.status) {
        map.set(emp.employee_status_id, emp.status);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);
  
  // Show status filter only if there are status values
  const showStatusFilter = statusOptions.length > 0 || employees.length === 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters:</span>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground">
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-sm">
              {ASSETS_TOOLTIPS.filters}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Department Filter - only show if departments exist */}
        {showDepartmentFilter && (
          <Select
            value={filters.department}
            onValueChange={(v) => updateFilter("department", v)}
          >
            <SelectTrigger className="w-[140px] h-9 bg-background">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Roles</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}


        {/* More Filters Dropdown - only show if secondary filters have data */}
        {(showHireDateFilter || showCredentialFilter) && (
          <Popover open={moreFiltersOpen} onOpenChange={setMoreFiltersOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "h-9 gap-1.5",
                  hasAdvancedFilters && "border-primary/50 bg-primary/5"
                )}
              >
                More Filters
                {advancedFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {advancedFilterCount}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4 bg-popover" align="start">
              <div className="space-y-4">
                {/* Hire Date - only show if hire dates exist */}
                {showHireDateFilter && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Hire Date</label>
                    <Select
                      value={filters.hireDateRange}
                      onValueChange={(v) => updateFilter("hireDateRange", v)}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="All Hire Dates" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">All Hire Dates</SelectItem>
                        <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                        <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                        <SelectItem value="last-year">Last Year</SelectItem>
                        <SelectItem value="over-1-year">Over 1 Year</SelectItem>
                        <SelectItem value="over-5-years">Over 5 Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Credential Status - only show if credential data exists */}
                {showCredentialFilter && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Credential Status</label>
                    <Select
                      value={filters.complianceStatus}
                      onValueChange={(v) => updateFilter("complianceStatus", v)}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="All Credentials" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">All Credentials</SelectItem>
                        <SelectItem value="fully-compliant">All Complete</SelectItem>
                        <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
                        <SelectItem value="non-compliant">Incomplete</SelectItem>
                        <SelectItem value="missing-credentials">Missing Credentials</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {hasAdvancedFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      updateFilter("hireDateRange", "all");
                      updateFilter("complianceStatus", "all");
                    }}
                    className="w-full text-muted-foreground hover:text-foreground"
                  >
                    Clear Advanced Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-9 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.department !== "all" && (
            <Badge variant="secondary" className="gap-1 bg-secondary text-secondary-foreground">
              Dept: {filters.department}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => updateFilter("department", "all")}
              />
            </Badge>
          )}
          {filters.status !== "all" && (
            <Badge variant="secondary" className="gap-1 bg-secondary text-secondary-foreground">
              Status: {filters.status}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => updateFilter("status", "all")}
              />
            </Badge>
          )}
          {filters.hireDateRange !== "all" && (
            <Badge variant="secondary" className="gap-1 bg-secondary text-secondary-foreground">
              Hired: {filters.hireDateRange.replace(/-/g, " ")}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => updateFilter("hireDateRange", "all")}
              />
            </Badge>
          )}
          {filters.complianceStatus !== "all" && (
            <Badge variant="secondary" className="gap-1 bg-secondary text-secondary-foreground">
              Credentials: {filters.complianceStatus.replace(/-/g, " ").replace("non compliant", "incomplete")}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => updateFilter("complianceStatus", "all")}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// Filter Application Helper (Legacy)
// ==========================================

export const filterEmployees = (
  employees: any[],
  filters: EmployeeFiltersState,
  searchQuery: string
) => {
  const now = new Date();

  return employees.filter((emp) => {
    // Search filter - includes tags
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    const tagsMatch = emp.tags?.some((tag: string) => 
      tag.toLowerCase().includes(query)
    );
    const matchesSearch =
      !searchQuery ||
      fullName.includes(query) ||
      emp.position?.toLowerCase().includes(query) ||
      emp.employee_id?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.department?.toLowerCase().includes(query) ||
      tagsMatch;

    if (!matchesSearch) return false;

    // Department filter - compare by ID
    if (filters.department !== "all" && emp.department_id !== filters.department) {
      return false;
    }

    // Status filter - compare by ID
    if (filters.status !== "all") {
      if (emp.employee_status_id !== filters.status) return false;
    }

    // Hire date filter
    if (filters.hireDateRange !== "all" && emp.hire_date) {
      const hireDate = new Date(emp.hire_date);
      const daysAgo = Math.floor((now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (filters.hireDateRange) {
        case "last-30-days":
          if (daysAgo > 30) return false;
          break;
        case "last-90-days":
          if (daysAgo > 90) return false;
          break;
        case "last-year":
          if (daysAgo > 365) return false;
          break;
        case "over-1-year":
          if (daysAgo <= 365) return false;
          break;
        case "over-5-years":
          if (daysAgo <= 365 * 5) return false;
          break;
      }
    }

    // Compliance status filter
    if (filters.complianceStatus !== "all") {
      const stats = emp.requirements_stats || {};
      switch (filters.complianceStatus) {
        case "fully-compliant":
          if (stats.missing_expired > 0 || stats.expiring_soon > 0) return false;
          break;
        case "expiring-soon":
          if (!stats.expiring_soon || stats.expiring_soon === 0) return false;
          break;
        case "non-compliant":
          if (!stats.missing_expired || stats.missing_expired === 0) return false;
          break;
        case "missing-credentials":
          if (stats.total > 0) return false;
          break;
      }
    }

    // Role filter
    if (filters.role && filters.role !== "all") {
      const empRole = emp.team_role?.name || emp.position || "";
      if (empRole !== filters.role) return false;
    }

    // Credential type filter
    if (filters.credentialType && filters.credentialType !== "all") {
      const reqs = emp.employee_requirements || [];
      const hasType = reqs.some((r: any) => r.requirement?.title === filters.credentialType);
      if (!hasType) return false;
    }

    // Expiration window filter
    if (filters.expirationWindow && filters.expirationWindow !== "all") {
      const reqs = emp.employee_requirements || [];
      const now = new Date();
      switch (filters.expirationWindow) {
        case "expiring-30": {
          const cutoff = new Date(now.getTime() + 30 * 86400000);
          const has = reqs.some((r: any) => r.expire_date && new Date(r.expire_date) <= cutoff && new Date(r.expire_date) > now);
          if (!has) return false;
          break;
        }
        case "expiring-60": {
          const cutoff = new Date(now.getTime() + 60 * 86400000);
          const has = reqs.some((r: any) => r.expire_date && new Date(r.expire_date) <= cutoff && new Date(r.expire_date) > now);
          if (!has) return false;
          break;
        }
        case "expiring-90": {
          const cutoff = new Date(now.getTime() + 90 * 86400000);
          const has = reqs.some((r: any) => r.expire_date && new Date(r.expire_date) <= cutoff && new Date(r.expire_date) > now);
          if (!has) return false;
          break;
        }
        case "already-expired": {
          const has = reqs.some((r: any) => r.expire_date && new Date(r.expire_date) < now);
          if (!has) return false;
          break;
        }
      }
    }

    return true;
  });
};
