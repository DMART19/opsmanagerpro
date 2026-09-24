import { Search, X, SlidersHorizontal, ScanLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";

export interface TaxonomyFilterOption {
  id: string;
  name: string;
}

export interface InventoryFilters {
  search: string;
  section: string[];
  subcategory: string[];      // stores category IDs
  manufacturer: string[];     // stores manufacturer IDs
  status: string[];           // stores asset_status IDs
  groupAbbv: string[];        // stores asset_group IDs
  groupYear: string[];
  isInternal: string | null;
  container: string[];
  expiringDays: number | null;
  assetType: "all" | "item" | "container";
  customFields: Record<string, string[]>; // attributeId → selected values
}

export interface CustomFieldFilterOption {
  attributeId: string;
  attributeName: string;
  values: string[]; // distinct non-empty values
}

interface QuickFilterBarProps {
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
    customFields: CustomFieldFilterOption[];
  };
  onScanClick?: () => void;
}

// Helper to resolve taxonomy ID to name
const resolveName = (options: TaxonomyFilterOption[], id: string): string => {
  return options.find(o => o.id === id)?.name || id;
};

export const QuickFilterBar = ({
  filters,
  onFiltersChange,
  onScanClick,
  uniqueValues,
}: QuickFilterBarProps) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const { assetSettings } = useSettings();
  
  // Use status options from settings
  const statusOptions = assetSettings.status_options.map(s => ({ value: s, label: s }));

  const updateFilter = (key: keyof InventoryFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const removeFilter = (key: keyof InventoryFilters, value?: string) => {
    if (key === 'isInternal' || key === 'expiringDays') {
      onFiltersChange({ ...filters, [key]: null });
    } else if (key === 'assetType') {
      onFiltersChange({ ...filters, assetType: "all" });
    } else if (key === 'customFields' && value) {
      // value format: "attrId:val"
      const sepIdx = value.indexOf(":");
      const attrId = value.slice(0, sepIdx);
      const attrVal = value.slice(sepIdx + 1);
      const current = filters.customFields?.[attrId] || [];
      const updated = current.filter(v => v !== attrVal);
      const newCustomFields = { ...filters.customFields };
      if (updated.length === 0) {
        delete newCustomFields[attrId];
      } else {
        newCustomFields[attrId] = updated;
      }
      onFiltersChange({ ...filters, customFields: newCustomFields });
    } else if (value && Array.isArray(filters[key])) {
      onFiltersChange({
        ...filters,
        [key]: (filters[key] as string[]).filter(v => v !== value),
      });
    }
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
    filters.section.length > 0 ||
    filters.subcategory.length > 0 ||
    filters.manufacturer.length > 0 ||
    filters.status.length > 0 ||
    filters.groupAbbv.length > 0 ||
    filters.groupYear.length > 0 ||
    filters.isInternal !== null ||
    filters.container.length > 0 ||
    filters.expiringDays !== null ||
    filters.assetType !== "all" ||
    Object.values(filters.customFields || {}).some(v => v.length > 0);

  const customFieldFilterCount = Object.values(filters.customFields || {}).reduce((sum, v) => sum + v.length, 0);

  const advancedFilterCount = 
    filters.manufacturer.length + 
    filters.groupAbbv.length + 
    filters.groupYear.length + 
    (filters.isInternal !== null ? 1 : 0) +
    (filters.expiringDays !== null ? 1 : 0) +
    customFieldFilterCount;

  // Get all active filter chips
  const getActiveFilterChips = () => {
    const chips: { key: keyof InventoryFilters; value: string; label: string }[] = [];
    
    filters.section.forEach(v => chips.push({ key: 'section', value: v, label: v }));
    filters.subcategory.forEach(v => chips.push({ key: 'subcategory', value: v, label: resolveName(uniqueValues.subcategories, v) }));
    filters.status.forEach(v => chips.push({ key: 'status', value: v, label: resolveName(uniqueValues.statuses, v) }));
    filters.container.forEach(v => {
      const c = uniqueValues.containers.find(c => c.id === v);
      chips.push({ key: 'container', value: v, label: c?.label || v });
    });
    filters.manufacturer.forEach(v => chips.push({ key: 'manufacturer', value: v, label: resolveName(uniqueValues.manufacturers, v) }));
    filters.groupAbbv.forEach(v => chips.push({ key: 'groupAbbv', value: v, label: resolveName(uniqueValues.groupAbbvs, v) }));
    filters.groupYear.forEach(v => chips.push({ key: 'groupYear', value: v, label: v }));
    if (filters.isInternal) {
      chips.push({ key: 'isInternal', value: filters.isInternal, label: filters.isInternal === 'yes' ? 'Internal' : 'External' });
    }
    if (filters.expiringDays !== null) {
      chips.push({ key: 'expiringDays', value: String(filters.expiringDays), label: `Expiring in ${filters.expiringDays} days` });
    }
    if (filters.assetType !== "all") {
      chips.push({ key: 'assetType', value: filters.assetType, label: filters.assetType === 'item' ? 'Items Only' : 'Containers Only' });
    }
    // Custom field filter chips
    Object.entries(filters.customFields || {}).forEach(([attrId, vals]) => {
      const cf = uniqueValues.customFields.find(f => f.attributeId === attrId);
      vals.forEach(v => {
        chips.push({ key: 'customFields', value: `${attrId}:${v}`, label: `${cf?.attributeName || 'Field'}: ${v}` });
      });
    });
    
    return chips;
  };

  const activeChips = getActiveFilterChips();

  // Dynamic filter visibility: only show when >1 distinct values exist
  const hasLocations = uniqueValues.sections.length > 1;
  const hasCategories = uniqueValues.subcategories.length > 1;
  const hasStatuses = uniqueValues.statuses.length > 1;
  const hasContainers = uniqueValues.containers.length > 1;
  const hasManufacturers = uniqueValues.manufacturers.length > 1;
  const hasGroups = uniqueValues.groupAbbvs.length > 1;
  const hasYears = uniqueValues.groupYears.length > 1;
  const hasCustomFields = uniqueValues.customFields.length > 0;
  // "More" button shown when any advanced filter has meaningful options
  const hasAnyAdvanced = hasManufacturers || hasGroups || hasYears || hasCustomFields;

  return (
    <div className="space-y-3">
      {/* Row 1: Search bar + Scan button */}
      <div className="flex gap-2" data-tour="search-input">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items, containers, or locations…"
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10 pr-10 h-11 text-sm rounded-xl bg-muted/30 border-border/40 focus-visible:bg-background"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter("search", "")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {onScanClick && (
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl flex-shrink-0 border-primary/20 bg-primary/5 hover:bg-primary/10 active:scale-[0.96] transition-all duration-150"
            onClick={onScanClick}
            aria-label="Scan barcode to search"
          >
            <ScanLine className="h-5 w-5 text-primary" />
          </Button>
        )}
      </div>

      {/* Row 2: Segmented type + filter dropdowns */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Segmented Type Toggle */}
        <div className="inline-flex items-center rounded-xl bg-muted/50 p-1 h-10">
          {([
            { value: "all", label: "All" },
            { value: "item", label: "Items" },
            { value: "container", label: "Containers" },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilter("assetType", opt.value)}
              className={`
                px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 uppercase tracking-wide
                ${filters.assetType === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        {(hasLocations || hasCategories || hasStatuses || hasContainers) && (
          <div className="h-6 w-px bg-border/40 mx-0.5 hidden sm:block" />
        )}

        {/* Location Dropdown */}
        {hasLocations && (
          <Select 
            value={filters.section[0] || "__all__"} 
            onValueChange={(v) => updateFilter("section", v === "__all__" ? [] : [v])}
          >
            <SelectTrigger className="w-[150px] h-10 rounded-xl border-border/40 bg-muted/20 text-xs font-medium">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Locations</SelectItem>
              {uniqueValues.sections.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Category Dropdown */}
        {hasCategories && (
          <Select 
            value={filters.subcategory[0] || "__all__"} 
            onValueChange={(v) => updateFilter("subcategory", v === "__all__" ? [] : [v])}
          >
            <SelectTrigger className="w-[150px] h-10 rounded-xl border-border/40 bg-muted/20 text-xs font-medium">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Categories</SelectItem>
              {uniqueValues.subcategories.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Status Dropdown */}
        {hasStatuses && (
          <Select 
            value={filters.status[0] || "__all__"} 
            onValueChange={(v) => updateFilter("status", v === "__all__" ? [] : [v])}
          >
            <SelectTrigger className="w-[140px] h-10 rounded-xl border-border/40 bg-muted/20 text-xs font-medium">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Statuses</SelectItem>
              {uniqueValues.statuses.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Container Dropdown */}
        {hasContainers && (
          <Select 
            value={filters.container[0] || "__all__"} 
            onValueChange={(v) => updateFilter("container", v === "__all__" ? [] : [v])}
          >
            <SelectTrigger className="w-[160px] h-10 rounded-xl border-border/40 bg-muted/20 text-xs font-medium">
              <SelectValue placeholder="Container" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Containers</SelectItem>
              <SelectItem value="__none__">No Container</SelectItem>
              {uniqueValues.containers.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Compact More Filters Icon Button */}
        {hasAnyAdvanced && (
          <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 rounded-xl border-border/40 bg-muted/20 relative"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {advancedFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    {advancedFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Advanced Filters</SheetTitle>
                <SheetDescription>
                  Filter by additional criteria
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                {/* Expiring Soon */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expiring Soon</label>
                  <Select 
                    value={filters.expiringDays !== null ? String(filters.expiringDays) : "__all__"} 
                    onValueChange={(v) => updateFilter("expiringDays", v === "__all__" ? null : Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No expiration filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">No expiration filter</SelectItem>
                      <SelectItem value="7">Expiring in 7 days</SelectItem>
                      <SelectItem value="30">Expiring in 30 days</SelectItem>
                      <SelectItem value="90">Expiring in 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasManufacturers && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Manufacturer</label>
                    <Select 
                      value={filters.manufacturer[0] || "__all__"} 
                      onValueChange={(v) => updateFilter("manufacturer", v === "__all__" ? [] : [v])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Manufacturers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Manufacturers</SelectItem>
                        {uniqueValues.manufacturers.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {hasGroups && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Group</label>
                    <Select 
                      value={filters.groupAbbv[0] || "__all__"} 
                      onValueChange={(v) => updateFilter("groupAbbv", v === "__all__" ? [] : [v])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Groups" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Groups</SelectItem>
                        {uniqueValues.groupAbbvs.map(g => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {hasYears && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Year</label>
                    <Select 
                      value={filters.groupYear[0] || "__all__"} 
                      onValueChange={(v) => updateFilter("groupYear", v === "__all__" ? [] : [v])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Years</SelectItem>
                        {uniqueValues.groupYears.map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Ownership</label>
                  <Select 
                    value={filters.isInternal || "__all__"} 
                    onValueChange={(v) => updateFilter("isInternal", v === "__all__" ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All</SelectItem>
                      <SelectItem value="yes">Internal Only</SelectItem>
                      <SelectItem value="no">External Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Fields */}
                {uniqueValues.customFields.map(cf => (
                  <div key={cf.attributeId} className="space-y-2">
                    <label className="text-sm font-medium">{cf.attributeName}</label>
                    <Select 
                      value={(filters.customFields?.[cf.attributeId]?.[0]) || "__all__"} 
                      onValueChange={(v) => {
                        const newCustomFields = { ...filters.customFields };
                        if (v === "__all__") {
                          delete newCustomFields[cf.attributeId];
                        } else {
                          newCustomFields[cf.attributeId] = [v];
                        }
                        onFiltersChange({ ...filters, customFields: newCustomFields });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`All ${cf.attributeName}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All {cf.attributeName}</SelectItem>
                        {cf.values.map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                {advancedFilterCount > 0 && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => {
                      onFiltersChange({
                        ...filters,
                        manufacturer: [],
                        groupAbbv: [],
                        groupYear: [],
                        isInternal: null,
                        expiringDays: null,
                        assetType: "all",
                        customFields: {},
                      });
                    }}
                  >
                    Clear Advanced Filters
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Clear all — shown inline when filters active */}
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg"
            onClick={clearAllFilters}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip, i) => (
            <Badge 
              key={`${chip.key}-${chip.value}-${i}`}
              variant="secondary" 
              className="cursor-pointer gap-1 hover:bg-secondary/80 transition-colors rounded-lg text-xs py-1"
              onClick={() => removeFilter(chip.key, chip.value)}
            >
              {chip.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
