import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { EmployeeFiltersState } from "../EmployeeFilters";
import { useTeamFilter } from "@/contexts/TeamFilterContext";

interface MobileTeamActiveFiltersProps {
  filters: EmployeeFiltersState;
  onFiltersChange: (filters: EmployeeFiltersState) => void;
  searchQuery: string;
  onClearSearch: () => void;
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

export const MobileTeamActiveFilters = ({
  filters,
  onFiltersChange,
  searchQuery,
  onClearSearch,
}: MobileTeamActiveFiltersProps) => {
  const { activeFilter, setActiveFilter } = useTeamFilter();

  const activeChips: Array<{
    key: string;
    label: string;
    onRemove: () => void;
  }> = [];

  // Search query chip
  if (searchQuery) {
    activeChips.push({
      key: "search",
      label: `"${searchQuery}"`,
      onRemove: onClearSearch,
    });
  }

  // Context filter chip
  if (activeFilter && activeFilter !== "all") {
    const filterLabels: Record<string, string> = {
      compliant: "Up to Date",
      "expiring-soon": "Expiring Soon",
      incomplete: "Needs Attention",
    };
    activeChips.push({
      key: "context",
      label: filterLabels[activeFilter] || activeFilter,
      onRemove: () => setActiveFilter(null),
    });
  }

  // Role chip
  if (filters.role && filters.role !== "all") {
    activeChips.push({
      key: "role",
      label: `Role: ${filters.role}`,
      onRemove: () => onFiltersChange({ ...filters, role: "all" }),
    });
  }

  // Department chip
  if (filters.department !== "all") {
    activeChips.push({
      key: "department",
      label: filters.department,
      onRemove: () => onFiltersChange({ ...filters, department: "all" }),
    });
  }

  // Compliance status chip
  if (filters.complianceStatus !== "all") {
    const complianceLabels: Record<string, string> = {
      "fully-compliant": "Up to Date",
      "expiring-soon": "Expiring Soon",
      "non-compliant": "Needs Attention",
      "missing-credentials": "No Credentials",
    };
    activeChips.push({
      key: "compliance",
      label: complianceLabels[filters.complianceStatus] || filters.complianceStatus,
      onRemove: () => onFiltersChange({ ...filters, complianceStatus: "all" }),
    });
  }

  // Credential type chip
  if (filters.credentialType && filters.credentialType !== "all") {
    activeChips.push({
      key: "credentialType",
      label: `Type: ${filters.credentialType}`,
      onRemove: () => onFiltersChange({ ...filters, credentialType: "all" }),
    });
  }

  // Expiration window chip
  if (filters.expirationWindow && filters.expirationWindow !== "all") {
    const windowLabels: Record<string, string> = {
      "expiring-30": "Expiring in 30d",
      "expiring-60": "Expiring in 60d",
      "expiring-90": "Expiring in 90d",
      "already-expired": "Already Expired",
    };
    activeChips.push({
      key: "expirationWindow",
      label: windowLabels[filters.expirationWindow] || filters.expirationWindow,
      onRemove: () => onFiltersChange({ ...filters, expirationWindow: "all" }),
    });
  }

  // Hire date chip
  if (filters.hireDateRange !== "all") {
    const hireDateLabels: Record<string, string> = {
      "last-30-days": "Hired < 30 days",
      "last-90-days": "Hired < 90 days",
      "last-year": "Hired < 1 year",
      "over-1-year": "Hired > 1 year",
    };
    activeChips.push({
      key: "hireDate",
      label: hireDateLabels[filters.hireDateRange] || filters.hireDateRange,
      onRemove: () => onFiltersChange({ ...filters, hireDateRange: "all" }),
    });
  }

  if (activeChips.length === 0) return null;

  return (
    <ScrollArea className="w-full -mx-4 px-4">
      <div className="flex gap-2 py-2">
        {activeChips.map((chip) => (
          <Badge
            key={chip.key}
            variant="secondary"
            className="flex-shrink-0 gap-1 pr-1 pl-2.5 py-1 text-xs"
          >
            {chip.label}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={chip.onRemove}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove filter</span>
            </Button>
          </Badge>
        ))}

        {activeChips.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 h-6 text-xs text-muted-foreground"
            onClick={() => {
              onClearSearch();
              setActiveFilter(null);
              onFiltersChange({ ...DEFAULT_FILTERS });
            }}
          >
            Clear all
          </Button>
        )}
      </div>
      <ScrollBar orientation="horizontal" className="invisible" />
    </ScrollArea>
  );
};
