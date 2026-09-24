import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { History, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useItemCheckoutHistory, CheckoutHistoryRecord } from "@/hooks/use-item-checkout-history";
import { useEmployees } from "@/hooks/use-employees";
import { ActivityHistoryEntry } from "./ActivityHistoryEntry";
import { ActivityHistoryFilters } from "./ActivityHistoryFilters";
import { ActivityHistoryEmpty } from "./ActivityHistoryEmpty";
import { ActivityHistoryFilters as FiltersType, getActivityStatus, EditableFields } from "./types";
import { toast } from "sonner";

interface AssetActivityHistoryProps {
  itemId: string | null;
  maxItems?: number;
}

export const AssetActivityHistory = ({ itemId, maxItems = 10 }: AssetActivityHistoryProps) => {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [filters, setFilters] = useState<FiltersType>({
    actionType: 'all',
    employeeId: null,
    status: 'all',
    sortOrder: 'newest',
  });

  // Fetch history with employee filter
  const { history, loading, refetch } = useItemCheckoutHistory(itemId, {
    actionType: filters.actionType,
    employeeId: filters.employeeId,
  });

  const { employees } = useEmployees();

  // Apply additional client-side filtering and sorting
  const filteredHistory = useMemo(() => {
    let result = [...history];

    // Filter by status
    if (filters.status !== 'all') {
      result = result.filter((record) => {
        const status = getActivityStatus(record);
        return status.status === filters.status;
      });
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.checked_out_at).getTime();
      const dateB = new Date(b.checked_out_at).getTime();
      return filters.sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [history, filters.status, filters.sortOrder]);

  const displayedHistory = showAll ? filteredHistory : filteredHistory.slice(0, maxItems);
  const hasMore = filteredHistory.length > maxItems;
  const hasActiveFilters = filters.actionType !== 'all' || filters.employeeId !== null || filters.status !== 'all';

  // Update handler for editable fields
  const handleUpdate = async (id: string, fields: Partial<EditableFields>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("item_checkouts")
        .update({
          checkin_notes: fields.checkin_notes,
          return_condition: fields.return_condition,
          expected_return_at: fields.expected_return_at,
          checkout_notes: fields.checkout_notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Error updating checkout:", error);
        toast.error("Failed to update", { description: error.message });
        return false;
      }

      refetch();
      return true;
    } catch (error: any) {
      console.error("Error updating checkout:", error);
      toast.error("Failed to update");
      return false;
    }
  };

  if (!itemId) return null;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="p-0 h-auto hover:bg-transparent flex items-center gap-2"
            >
              <History className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Activity History</h4>
              {history.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">
                  {history.length}
                </Badge>
              )}
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>

          {expanded && history.length > 0 && (
            <ActivityHistoryFilters
              filters={filters}
              onFiltersChange={setFilters}
              employees={employees}
            />
          )}
        </div>

        <CollapsibleContent className="space-y-3">
          {/* Loading State */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredHistory.length === 0 && (
            <ActivityHistoryEmpty hasFilters={hasActiveFilters} />
          )}

          {/* History List */}
          {!loading && filteredHistory.length > 0 && (
            <div className="space-y-3">
              {displayedHistory.map((record) => (
                <ActivityHistoryEntry
                  key={record.id}
                  record={record}
                  onUpdate={handleUpdate}
                />
              ))}

              {/* Show More Button */}
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs h-9"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? "Show less" : `Show all ${filteredHistory.length} records`}
                </Button>
              )}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

// Re-export for backwards compatibility
export { ActivityHistoryEntry } from "./ActivityHistoryEntry";
export { ActivityHistoryFilters } from "./ActivityHistoryFilters";
export { ActivityHistoryEmpty } from "./ActivityHistoryEmpty";
export * from "./types";
