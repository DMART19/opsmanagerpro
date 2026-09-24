import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MobileContainerFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  groupFilter: string;
  onGroupChange: (value: string) => void;
  boxTypes: string[];
  statuses: string[];
  groups: string[];
  onReset: () => void;
}

export const MobileContainerFilterSheet = ({
  open,
  onOpenChange,
  typeFilter,
  onTypeChange,
  statusFilter,
  onStatusChange,
  groupFilter,
  onGroupChange,
  boxTypes,
  statuses,
  groups,
  onReset,
}: MobileContainerFilterSheetProps) => {
  const hasActiveFilters = typeFilter !== "all" || statusFilter !== "all" || groupFilter !== "all";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl h-[70vh]">
        <SheetHeader className="flex flex-row items-center justify-between pr-14">
          <SheetTitle>Filter Containers</SheetTitle>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onReset}
              className="text-primary"
            >
              Reset All
            </Button>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Type Filter - only shown when >1 distinct types exist */}
          {boxTypes.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Container Type</Label>
              <Select value={typeFilter} onValueChange={onTypeChange}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {boxTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status Filter - only shown when >1 distinct statuses exist */}
          {statuses.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={statusFilter} onValueChange={onStatusChange}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Group Filter - only shown when >1 distinct groups exist */}
          {groups.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Group</Label>
              <Select value={groupFilter} onValueChange={onGroupChange}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Message when no filters available */}
          {boxTypes.length <= 1 && statuses.length <= 1 && groups.length <= 1 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No meaningful filter options available yet. Add more containers with different types, statuses, or groups to enable filters.
            </p>
          )}

          {/* Apply Button */}
          <Button 
            className="w-full h-12 mt-4" 
            onClick={() => onOpenChange(false)}
          >
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
