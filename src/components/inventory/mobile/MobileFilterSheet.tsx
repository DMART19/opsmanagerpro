import { useState, useEffect } from "react";
import { Filter, Package, Box, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { InventoryFilters, TaxonomyFilterOption } from "../QuickFilterBar";
import { cn } from "@/lib/utils";

interface CustomFieldFilterOption {
  attributeId: string;
  attributeName: string;
  values: string[];
}

interface MobileFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
}

// Chip-style toggle for single or multi-select
const FilterChip = ({
  label,
  active,
  onToggle,
  icon,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onToggle}
    className={cn(
      "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150",
      "border active:scale-[0.97]",
      active
        ? "bg-primary/10 border-primary/30 text-primary"
        : "bg-muted/40 border-border/40 text-muted-foreground hover:bg-muted/60"
    )}
  >
    {icon}
    {label}
  </button>
);

export const MobileFilterSheet = ({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  uniqueValues,
}: MobileFilterSheetProps) => {
  const [local, setLocal] = useState(filters);

  useEffect(() => {
    setLocal(filters);
  }, [filters]);

  const update = (key: keyof InventoryFilters, value: any) => {
    setLocal(prev => ({ ...prev, [key]: value }));
  };

  const toggleInArray = (key: keyof InventoryFilters, value: string) => {
    setLocal(prev => {
      const arr = (prev[key] as string[]) || [];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
  };

  const handleApply = () => {
    onFiltersChange(local);
    onOpenChange(false);
  };

  const handleClear = () => {
    const cleared: InventoryFilters = {
      search: filters.search,
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
    };
    setLocal(cleared);
    onFiltersChange(cleared);
    onOpenChange(false);
  };

  const customFieldFilterCount = Object.values(local.customFields || {}).reduce((sum, v) => sum + v.length, 0);

  const activeCount =
    local.section.length +
    local.subcategory.length +
    local.manufacturer.length +
    local.status.length +
    local.groupAbbv.length +
    local.groupYear.length +
    local.container.length +
    (local.isInternal !== null ? 1 : 0) +
    (local.expiringDays !== null ? 1 : 0) +
    (local.assetType !== "all" ? 1 : 0) +
    customFieldFilterCount;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl px-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-5 pb-3 border-b pr-14">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4.5 w-4.5" />
              Filters
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                  {activeCount}
                </Badge>
              )}
            </SheetTitle>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-destructive hover:text-destructive h-8 text-xs gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Scrollable filter body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* ── Type ── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label>
            <div className="flex gap-2">
              <FilterChip
                label="All"
                active={local.assetType === "all"}
                onToggle={() => update("assetType", "all")}
              />
              <FilterChip
                label="Items"
                active={local.assetType === "item"}
                onToggle={() => update("assetType", "item")}
                icon={<Package className="h-3.5 w-3.5" />}
              />
              <FilterChip
                label="Containers"
                active={local.assetType === "container"}
                onToggle={() => update("assetType", "container")}
                icon={<Box className="h-3.5 w-3.5" />}
              />
            </div>
          </div>

          {/* ── Location ── */}
          {uniqueValues.sections.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</Label>
              <div className="flex flex-wrap gap-2">
                {uniqueValues.sections.map(s => (
                  <FilterChip
                    key={s}
                    label={s}
                    active={local.section.includes(s)}
                    onToggle={() => toggleInArray("section", s)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Category ── */}
          {uniqueValues.subcategories.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
              <div className="flex flex-wrap gap-2">
                {uniqueValues.subcategories.map(s => (
                  <FilterChip
                    key={s.id}
                    label={s.name}
                    active={local.subcategory.includes(s.id)}
                    onToggle={() => toggleInArray("subcategory", s.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Status ── */}
          {uniqueValues.statuses.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
              <div className="flex flex-wrap gap-2">
                {uniqueValues.statuses.map(s => (
                  <FilterChip
                    key={s.id}
                    label={s.name}
                    active={local.status.includes(s.id)}
                    onToggle={() => toggleInArray("status", s.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Container ── */}
          {uniqueValues.containers.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Container</Label>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  label="No Container"
                  active={local.container.includes("__none__")}
                  onToggle={() => toggleInArray("container", "__none__")}
                />
                {uniqueValues.containers.map(c => (
                  <FilterChip
                    key={c.id}
                    label={c.label}
                    active={local.container.includes(c.id)}
                    onToggle={() => toggleInArray("container", c.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Expiring Soon ── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expiring Soon</Label>
            <div className="flex gap-2">
              {[
                { value: null, label: "Any" },
                { value: 7, label: "7 days" },
                { value: 30, label: "30 days" },
                { value: 90, label: "90 days" },
              ].map(opt => (
                <FilterChip
                  key={opt.label}
                  label={opt.label}
                  active={local.expiringDays === opt.value}
                  onToggle={() => update("expiringDays", local.expiringDays === opt.value ? null : opt.value)}
                />
              ))}
            </div>
          </div>

          {/* ── Manufacturer ── */}
          {uniqueValues.manufacturers.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Manufacturer</Label>
              <div className="flex flex-wrap gap-2">
                {uniqueValues.manufacturers.map(m => (
                  <FilterChip
                    key={m.id}
                    label={m.name}
                    active={local.manufacturer.includes(m.id)}
                    onToggle={() => toggleInArray("manufacturer", m.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Group ── */}
          {uniqueValues.groupAbbvs.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Group</Label>
              <div className="flex flex-wrap gap-2">
                {uniqueValues.groupAbbvs.map(g => (
                  <FilterChip
                    key={g.id}
                    label={g.name}
                    active={local.groupAbbv.includes(g.id)}
                    onToggle={() => toggleInArray("groupAbbv", g.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Year ── */}
          {uniqueValues.groupYears.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year</Label>
              <div className="flex flex-wrap gap-2">
                {uniqueValues.groupYears.map(y => (
                  <FilterChip
                    key={y}
                    label={String(y)}
                    active={local.groupYear.includes(String(y))}
                    onToggle={() => toggleInArray("groupYear", String(y))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Custom Fields ── */}
          {uniqueValues.customFields.map(cf => (
            <div key={cf.attributeId} className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cf.attributeName}</Label>
              <div className="flex flex-wrap gap-2">
                {cf.values.map(v => (
                  <FilterChip
                    key={v}
                    label={v}
                    active={(local.customFields?.[cf.attributeId] || []).includes(v)}
                    onToggle={() => {
                      const current = local.customFields?.[cf.attributeId] || [];
                      const newCustomFields = { ...local.customFields };
                      if (current.includes(v)) {
                        newCustomFields[cf.attributeId] = current.filter(x => x !== v);
                        if (newCustomFields[cf.attributeId].length === 0) delete newCustomFields[cf.attributeId];
                      } else {
                        newCustomFields[cf.attributeId] = [...current, v];
                      }
                      setLocal(prev => ({ ...prev, customFields: newCustomFields }));
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sticky footer */}
        <SheetFooter className="px-5 py-3 border-t bg-background">
          <Button onClick={handleApply} className="w-full h-12 text-base font-semibold">
            Show Results
            {activeCount > 0 && ` (${activeCount} filter${activeCount > 1 ? 's' : ''})`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
