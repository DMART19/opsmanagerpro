import { useState } from "react";
import { Search, X, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ASSETS_TOOLTIPS, GENERAL_TOOLTIPS } from "@/lib/tooltip-content";
import { InventoryFilters, TaxonomyFilterOption } from "./QuickFilterBar";

interface InventoryFilterBarProps {
  filters: InventoryFilters;
  onFiltersChange: (filters: InventoryFilters) => void;
  uniqueValues: {
    sections: string[];
    subcategories: TaxonomyFilterOption[];
    manufacturers: TaxonomyFilterOption[];
    statuses: TaxonomyFilterOption[];
    groupAbbvs: TaxonomyFilterOption[];
    groupYears: number[];
    containers: { id: string; label: string }[];
  };
}

export const InventoryFilterBar = ({
  filters,
  onFiltersChange,
  uniqueValues,
}: InventoryFilterBarProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof InventoryFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: "section" | "subcategory" | "manufacturer" | "status" | "groupAbbv" | "groupYear", value: string) => {
    const current = filters[key];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateFilter(key, updated);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: "",
      section: [],
      subcategory: [],
      manufacturer: [],
      status: [],
      groupAbbv: [],
      groupYear: [],
      isInternal: null,
      container: [],
      expiringDays: null,
      assetType: "all",
      customFields: {},
    });
  };

  const hasActiveFilters = 
    filters.search ||
    filters.section.length > 0 ||
    filters.subcategory.length > 0 ||
    filters.manufacturer.length > 0 ||
    filters.status.length > 0 ||
    filters.groupAbbv.length > 0 ||
    filters.groupYear.length > 0 ||
    filters.isInternal !== null;

  const advancedFilterCount = 
    filters.manufacturer.length + 
    filters.groupAbbv.length + 
    filters.groupYear.length + 
    (filters.isInternal !== null ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, description, manufacturer, or ID..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10"
          />
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                aria-label="Search help"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-sm">
              {GENERAL_TOOLTIPS.search}
            </TooltipContent>
          </Tooltip>
        </div>
        {hasActiveFilters && (
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={clearAllFilters}>
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-sm">
              Clear all filters
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Primary Filters — only rendered when >1 distinct values exist */}
      {(() => {
        const hasLocations = uniqueValues.sections.length > 1;
        const hasCategories = uniqueValues.subcategories.length > 1;
        const hasStatuses = uniqueValues.statuses.length > 1;
        const hasManufacturers = uniqueValues.manufacturers.length > 1;
        const hasGroups = uniqueValues.groupAbbvs.length > 1;
        const hasYears = uniqueValues.groupYears.length > 1;
        const hasAnyAdvanced = hasManufacturers || hasGroups || hasYears;
        const hasAnyPrimary = hasLocations || hasCategories || hasStatuses || hasAnyAdvanced;

        if (!hasAnyPrimary) return null;

        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {hasLocations && (
                <Select value={filters.section[0] || "all"} onValueChange={(v) => updateFilter("section", v === "all" ? [] : [v])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {uniqueValues.sections.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {hasCategories && (
                <Select value={filters.subcategory[0] || "all"} onValueChange={(v) => updateFilter("subcategory", v === "all" ? [] : [v])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueValues.subcategories.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {hasStatuses && (
                <Select value={filters.status[0] || "all"} onValueChange={(v) => updateFilter("status", v === "all" ? [] : [v])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {uniqueValues.statuses.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* More Filters Toggle */}
              {hasAnyAdvanced && (
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        More Filters
                        {advancedFilterCount > 0 && (
                          <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                            {advancedFilterCount}
                          </Badge>
                        )}
                      </span>
                      {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </div>

            {/* Advanced Filters (Collapsible) */}
            {hasAnyAdvanced && (
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleContent className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {hasManufacturers && (
                      <Select value={filters.manufacturer[0] || "all"} onValueChange={(v) => updateFilter("manufacturer", v === "all" ? [] : [v])}>
                        <SelectTrigger>
                          <SelectValue placeholder="Manufacturer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Manufacturers</SelectItem>
                          {uniqueValues.manufacturers.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {hasGroups && (
                      <Select value={filters.groupAbbv[0] || "all"} onValueChange={(v) => updateFilter("groupAbbv", v === "all" ? [] : [v])}>
                        <SelectTrigger>
                          <SelectValue placeholder="Group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Groups</SelectItem>
                          {uniqueValues.groupAbbvs.map(g => (
                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {hasYears && (
                      <Select value={filters.groupYear[0] || "all"} onValueChange={(v) => updateFilter("groupYear", v === "all" ? [] : [v])}>
                        <SelectTrigger>
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Years</SelectItem>
                          {uniqueValues.groupYears.map(y => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Select value={filters.isInternal || "all"} onValueChange={(v) => updateFilter("isInternal", v === "all" ? null : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Internal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="yes">Internal Only</SelectItem>
                        <SelectItem value="no">External Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        );
      })()}

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.section.map(s => (
            <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => toggleArrayFilter("section", s)}>
              {s} <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          {filters.subcategory.map(s => {
            const opt = uniqueValues.subcategories.find(o => o.id === s);
            return (
              <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => toggleArrayFilter("subcategory", s)}>
                {opt?.name || s} <X className="h-3 w-3 ml-1" />
              </Badge>
            );
          })}
          {filters.manufacturer.map(m => {
            const opt = uniqueValues.manufacturers.find(o => o.id === m);
            return (
              <Badge key={m} variant="secondary" className="cursor-pointer" onClick={() => toggleArrayFilter("manufacturer", m)}>
                {opt?.name || m} <X className="h-3 w-3 ml-1" />
              </Badge>
            );
          })}
          {filters.status.map(s => {
            const opt = uniqueValues.statuses.find(o => o.id === s);
            return (
              <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => toggleArrayFilter("status", s)}>
                {opt?.name || s} <X className="h-3 w-3 ml-1" />
              </Badge>
            );
          })}
          {filters.groupAbbv.map(g => {
            const opt = uniqueValues.groupAbbvs.find(o => o.id === g);
            return (
              <Badge key={g} variant="secondary" className="cursor-pointer" onClick={() => toggleArrayFilter("groupAbbv", g)}>
                {opt?.name || g} <X className="h-3 w-3 ml-1" />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};