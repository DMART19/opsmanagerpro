import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Check } from "lucide-react";
import { EmployeeFiltersState } from "../EmployeeFilters";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileTeamFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: EmployeeFiltersState;
  onFiltersChange: (filters: EmployeeFiltersState) => void;
  departments: { id: string; name: string }[];
  employees?: any[];
}

const DEFAULT_FILTERS: EmployeeFiltersState = {
  department: "all",
  status: "all",
  hireDateRange: "all",
  complianceStatus: "all",
  role: "all",
  credentialType: "all",
  expirationWindow: "all",
};

export const MobileTeamFilterSheet = ({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  departments,
  employees = [],
}: MobileTeamFilterSheetProps) => {
  const isMobile = useIsMobile();
  const handleReset = () => {
    onFiltersChange({ ...DEFAULT_FILTERS });
  };

  const allFilterKeys: (keyof typeof DEFAULT_FILTERS)[] = [
    "department", "status", "hireDateRange", "complianceStatus",
    "role", "credentialType", "expirationWindow",
  ];

  const hasActiveFilters = allFilterKeys.some(k => filters[k] !== "all");

  const activeCount = allFilterKeys.filter(k => filters[k] !== "all").length;

  // Dynamically determine which filters to show based on data
  const showDepartmentFilter = departments.length > 1;

  const showHireDateFilter = useMemo(() => {
    return employees.some(emp => emp.hire_date);
  }, [employees]);

  // Get unique status values from employees
  const statusOptions = useMemo(() => {
    const statuses = new Set<string>();
    employees.forEach(emp => {
      if (emp.status && emp.status.trim()) {
        statuses.add(emp.status);
      }
    });
    const options = [{ value: "all", label: "All Statuses" }];
    Array.from(statuses).sort().forEach(status => {
      options.push({ value: status, label: status });
    });
    return options;
  }, [employees]);

  const showStatusFilter = statusOptions.length > 2;

  // Role options - derived from data
  const roleOptions = useMemo(() => {
    const roles = new Set<string>();
    employees.forEach(emp => {
      const role = emp.team_role?.name || emp.position;
      if (role && role.trim()) roles.add(role);
    });
    const options = [{ value: "all", label: "All Roles" }];
    Array.from(roles).sort().forEach(r => options.push({ value: r, label: r }));
    return options;
  }, [employees]);

  const showRoleFilter = roleOptions.length > 2;

  // Credential type options - derived from employee_requirements
  const credentialTypeOptions = useMemo(() => {
    const types = new Set<string>();
    employees.forEach(emp => {
      const reqs = emp.employee_requirements || [];
      reqs.forEach((r: any) => {
        if (r.requirement?.title) types.add(r.requirement.title);
      });
    });
    const options = [{ value: "all", label: "All Credential Types" }];
    Array.from(types).sort().forEach(t => options.push({ value: t, label: t }));
    return options;
  }, [employees]);

  const showCredentialTypeFilter = credentialTypeOptions.length > 2;

  const complianceOptions = [
    { value: "all", label: "All" },
    { value: "fully-compliant", label: "Up to Date" },
    { value: "expiring-soon", label: "Expiring Soon" },
    { value: "non-compliant", label: "Needs Attention" },
    { value: "missing-credentials", label: "No Credentials" },
  ];

  const expirationWindowOptions = [
    { value: "all", label: "Any" },
    { value: "expiring-30", label: "Expiring in 30 days" },
    { value: "expiring-60", label: "Expiring in 60 days" },
    { value: "expiring-90", label: "Expiring in 90 days" },
    { value: "already-expired", label: "Already Expired" },
  ];

  const hireDateOptions = [
    { value: "all", label: "Any Hire Date" },
    { value: "last-30-days", label: "Last 30 Days" },
    { value: "last-90-days", label: "Last 90 Days" },
    { value: "last-year", label: "Last Year" },
    { value: "over-1-year", label: "Over 1 Year" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? "bottom" : "right"} className={cn(
        isMobile ? "h-[85vh] rounded-t-2xl px-0" : "w-full sm:max-w-md px-0"
      )}>
        <SheetHeader className="px-6 pb-4 border-b pr-14">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </SheetTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Reset All
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className={cn(
          "overflow-y-auto px-6 py-4 space-y-6",
          isMobile ? "h-[calc(85vh-140px)]" : "flex-1"
        )}>
          {/* Role Filter */}
          {showRoleFilter && (
            <FilterSection
              title="Role"
              value={filters.role || "all"}
              options={roleOptions}
              onChange={(value) =>
                onFiltersChange({ ...filters, role: value })
              }
            />
          )}

          {/* Credential Status */}
          <FilterSection
            title="Credential Status"
            value={filters.complianceStatus}
            options={complianceOptions}
            onChange={(value) =>
              onFiltersChange({ ...filters, complianceStatus: value })
            }
          />

          {/* Credential Type */}
          {showCredentialTypeFilter && (
            <FilterSection
              title="Credential Type"
              value={filters.credentialType || "all"}
              options={credentialTypeOptions}
              onChange={(value) =>
                onFiltersChange({ ...filters, credentialType: value })
              }
            />
          )}

          {/* Expiration Window */}
          <FilterSection
            title="Expiration Window"
            value={filters.expirationWindow || "all"}
            options={expirationWindowOptions}
            onChange={(value) =>
              onFiltersChange({ ...filters, expirationWindow: value })
            }
          />

          {/* Department Filter */}
          {showDepartmentFilter && (
            <FilterSection
              title="Department"
              value={filters.department}
              options={[
                { value: "all", label: "All Departments" },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
              onChange={(value) =>
                onFiltersChange({ ...filters, department: value })
              }
            />
          )}

          {/* Status Filter */}
          {showStatusFilter && (
            <FilterSection
              title="Status"
              value={filters.status}
              options={statusOptions}
              onChange={(value) =>
                onFiltersChange({ ...filters, status: value })
              }
            />
          )}

          {/* Hire Date */}
          {showHireDateFilter && (
            <FilterSection
              title="Hire Date"
              value={filters.hireDateRange}
              options={hireDateOptions}
              onChange={(value) =>
                onFiltersChange({ ...filters, hireDateRange: value })
              }
            />
          )}
        </div>

        {/* Apply Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Button
            className="w-full h-12"
            onClick={() => onOpenChange(false)}
          >
            Apply Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeCount}
              </Badge>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

interface FilterSectionProps {
  title: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

const FilterSection = ({
  title,
  value,
  options,
  onChange,
}: FilterSectionProps) => (
  <div>
    <h3 className="text-sm font-medium text-muted-foreground mb-3">{title}</h3>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9 text-xs gap-1.5",
            value === option.value && "gap-1"
          )}
          onClick={() => onChange(option.value)}
        >
          {value === option.value && <Check className="h-3.5 w-3.5" />}
          {option.label}
        </Button>
      ))}
    </div>
  </div>
);
