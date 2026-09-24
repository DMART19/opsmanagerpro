import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Clock,
  User,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  useItemCheckoutHistory, 
  CheckoutHistoryRecord,
  getCheckoutStatus,
  CheckoutHistoryFilters 
} from "@/hooks/use-item-checkout-history";
import { useEmployees } from "@/hooks/use-employees";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ItemCheckoutHistoryProps {
  itemId: string | null;
  maxItems?: number;
}

export const ItemCheckoutHistory = ({ itemId, maxItems = 10 }: ItemCheckoutHistoryProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [filters, setFilters] = useState<CheckoutHistoryFilters>({
    actionType: 'all',
    employeeId: null,
  });

  const { 
    history, 
    totalCheckouts, 
    loading 
  } = useItemCheckoutHistory(itemId, filters);

  const { employees } = useEmployees();

  const displayedHistory = showAll ? history : history.slice(0, maxItems);
  const hasMore = history.length > maxItems;

  if (!itemId) return null;

  const renderHistoryItem = (record: CheckoutHistoryRecord) => {
    const status = getCheckoutStatus(record);
    const employeeName = record.employee 
      ? `${record.employee.first_name} ${record.employee.last_name}`
      : "Unknown";
    const isReturned = !!record.checked_in_at;

    return (
      <div 
        key={record.id}
        className={cn(
          "rounded-lg border p-3 space-y-2 transition-colors",
          status.status === 'overdue' && "border-destructive/50 bg-destructive/5",
          status.status === 'returned' && "bg-muted/30"
        )}
      >
        {/* Header with action type */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "flex-shrink-0 rounded-full p-1.5",
              isReturned 
                ? "bg-muted text-muted-foreground" 
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            )}>
              {isReturned ? (
                <ArrowDownLeft className="h-3.5 w-3.5" />
              ) : (
                <ArrowUpRight className="h-3.5 w-3.5" />
              )}
            </div>
            <div className="min-w-0">
              <span className="font-medium text-sm">
                {isReturned ? "Checked in" : "Checked out"}
              </span>
            </div>
          </div>
          <Badge variant="outline" className={cn("text-xs", status.className)}>
            {status.label}
          </Badge>
        </div>

        {/* Details */}
        <div className="pl-8 space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{employeeName}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">Qty: {record.checked_out_quantity}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {format(new Date(record.checked_out_at), "MMM d, yyyy 'at' h:mm a")}
            </span>
            {record.expected_return_at && !isReturned && (
              <>
                <span>·</span>
                <span className={cn(status.status === 'overdue' && "text-destructive font-medium")}>
                  {status.status === 'overdue' ? (
                    <>
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      Overdue since {format(new Date(record.expected_return_at), "MMM d")}
                    </>
                  ) : (
                    `Due ${format(new Date(record.expected_return_at), "MMM d")}`
                  )}
                </span>
              </>
            )}
          </div>

          {/* Check-in info for returned items */}
          {isReturned && record.checked_in_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t mt-2">
              <ArrowDownLeft className="h-3 w-3" />
              <span>
                Returned {format(new Date(record.checked_in_at), "MMM d, yyyy 'at' h:mm a")}
              </span>
              {record.return_condition && (
                <>
                  <span>·</span>
                  <span>Condition: {record.return_condition}</span>
                </>
              )}
            </div>
          )}

          {/* Notes */}
          {(record.checkout_notes || record.checkin_notes) && (
            <div className="text-xs text-muted-foreground italic pt-1">
              {record.checkout_notes && <div>"{record.checkout_notes}"</div>}
              {record.checkin_notes && <div>Return note: "{record.checkin_notes}"</div>}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="p-0 h-auto hover:bg-transparent flex items-center gap-2"
            >
              <History className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium text-muted-foreground">
                Activity History
              </h4>
              {totalCheckouts > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {totalCheckouts}
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
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-3 w-3 mr-1" />
              Filter
            </Button>
          )}
        </div>

        <CollapsibleContent className="space-y-3">
          {/* Filters */}
          {showFilters && (
            <div className="flex gap-2 flex-wrap p-3 bg-muted/30 rounded-lg border">
              <Select
                value={filters.actionType || 'all'}
                onValueChange={(value) => setFilters({ ...filters, actionType: value as CheckoutHistoryFilters['actionType'] })}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="checked_out">Active only</SelectItem>
                  <SelectItem value="returned">Returned only</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.employeeId || 'all'}
                onValueChange={(value) => setFilters({ ...filters, employeeId: value === 'all' ? null : value })}
              >
                <SelectTrigger className="w-[160px] h-8 text-xs">
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

              {(filters.actionType !== 'all' || filters.employeeId) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setFilters({ actionType: 'all', employeeId: null })}
                >
                  Clear
                </Button>
              )}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && history.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No checkouts yet</p>
              <p className="text-xs">Activity will appear here once this item is used.</p>
            </div>
          )}

          {/* History list */}
          {!loading && history.length > 0 && (
            <div className="space-y-2">
              {displayedHistory.map(renderHistoryItem)}

              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? (
                    <>Show less</>
                  ) : (
                    <>Show all {history.length} records</>
                  )}
                </Button>
              )}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
