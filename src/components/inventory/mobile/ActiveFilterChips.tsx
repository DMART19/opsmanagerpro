import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface TaxonomyFilterOption {
  id: string;
  name: string;
}

interface InventoryFilters {
  search: string;
  section: string[];
  subcategory: string[];
  manufacturer: string[];
  status: string[];
  groupAbbv: string[];
  groupYear: string[];
  isInternal: string | null;
  container: string[];
  expiringDays: number | null;
  assetType: "all" | "item" | "container";
  customFields: Record<string, string[]>;
}

interface CustomFieldFilterOption {
  attributeId: string;
  attributeName: string;
  values: string[];
}

interface ActiveFilterChipsProps {
  filters: InventoryFilters;
  onRemoveFilter: (key: keyof InventoryFilters, value?: string) => void;
  uniqueValues?: {
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

const STATUS_LABELS: Record<string, string> = {
  'IN': 'Available',
  'OUT': 'In Use',
  'MAINT': 'Under Service',
  'RETIRED': 'Retired',
};

const resolveName = (options: TaxonomyFilterOption[] | undefined, id: string) => {
  return options?.find(o => o.id === id)?.name || id;
};

export const ActiveFilterChips = ({ filters, onRemoveFilter, uniqueValues }: ActiveFilterChipsProps) => {
  const chips: { key: keyof InventoryFilters; value: string; label: string }[] = [];

  filters.section.forEach(v => chips.push({ key: 'section', value: v, label: v }));
  filters.subcategory.forEach(v => chips.push({ key: 'subcategory', value: v, label: resolveName(uniqueValues?.subcategories, v) }));
  filters.manufacturer.forEach(v => chips.push({ key: 'manufacturer', value: v, label: resolveName(uniqueValues?.manufacturers, v) }));
  filters.status.forEach(v => chips.push({ key: 'status', value: v, label: resolveName(uniqueValues?.statuses, v) || STATUS_LABELS[v] || v }));
  filters.groupAbbv.forEach(v => chips.push({ key: 'groupAbbv', value: v, label: resolveName(uniqueValues?.groupAbbvs, v) }));
  filters.groupYear.forEach(v => chips.push({ key: 'groupYear', value: v, label: v }));
  filters.container.forEach(v => {
    if (v === '__none__') {
      chips.push({ key: 'container', value: v, label: 'No Container' });
    } else {
      const c = uniqueValues?.containers.find(c => c.id === v);
      chips.push({ key: 'container', value: v, label: c?.label || 'Container' });
    }
  });
  if (filters.isInternal !== null) {
    chips.push({ 
      key: 'isInternal', 
      value: filters.isInternal, 
      label: filters.isInternal === 'yes' ? 'Internal Only' : 'External Only' 
    });
  }
  if (filters.expiringDays !== null) {
    chips.push({
      key: 'expiringDays',
      value: String(filters.expiringDays),
      label: `Expiring in ${filters.expiringDays} days`,
    });
  }
  if (filters.assetType !== "all") {
    chips.push({
      key: 'assetType',
      value: filters.assetType,
      label: filters.assetType === 'item' ? 'Items Only' : 'Containers Only',
    });
  }
  // Custom field chips
  Object.entries(filters.customFields || {}).forEach(([attrId, vals]) => {
    const cf = uniqueValues?.customFields?.find(f => f.attributeId === attrId);
    vals.forEach(v => {
      chips.push({ key: 'customFields', value: `${attrId}:${v}`, label: `${cf?.attributeName || 'Field'}: ${v}` });
    });
  });

  if (chips.length === 0) return null;

  return (
    <div className="px-4 pb-2 lg:hidden">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2">
          {chips.map((chip, index) => (
            <Badge
              key={`${chip.key}-${chip.value}-${index}`}
              variant="secondary"
              className="flex-shrink-0 gap-1 pr-1 cursor-pointer hover:bg-secondary/80"
              onClick={() => onRemoveFilter(chip.key, chip.value)}
            >
              {chip.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
