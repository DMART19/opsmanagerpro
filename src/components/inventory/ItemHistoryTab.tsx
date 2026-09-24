import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Edit,
  LogOut,
  LogIn,
  MoveHorizontal,
  Clock,
  User,
} from "lucide-react";
import { useItemCheckoutHistory } from "@/hooks/use-item-checkout-history";
import { useEmployees } from "@/hooks/use-employees";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { CacheInventoryItem } from "@/hooks/use-cache-inventory";

interface HistoryEvent {
  id: string;
  type: "created" | "edited" | "checked_out" | "returned" | "container_moved";
  timestamp: string;
  actor?: string;
  details?: string;
}

const EVENT_CONFIG: Record<HistoryEvent["type"], { icon: typeof Plus; label: string; color: string }> = {
  created: { icon: Plus, label: "Created", color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400" },
  edited: { icon: Edit, label: "Edited", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400" },
  checked_out: { icon: LogOut, label: "Checked Out", color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400" },
  returned: { icon: LogIn, label: "Returned", color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400" },
  container_moved: { icon: MoveHorizontal, label: "Moved", color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400" },
};

interface ItemHistoryTabProps {
  item: CacheInventoryItem;
}

export const ItemHistoryTab = ({ item }: ItemHistoryTabProps) => {
  const { history, loading } = useItemCheckoutHistory(item.id, {});
  const { employees } = useEmployees();

  const employeeMap = useMemo(() => {
    const map = new Map<string, string>();
    (employees || []).forEach(e => {
      map.set(e.id, `${e.first_name} ${e.last_name}`);
    });
    return map;
  }, [employees]);

  const events = useMemo<HistoryEvent[]>(() => {
    const list: HistoryEvent[] = [];

    // Created event
    if (item.created_at) {
      list.push({
        id: "created",
        type: "created",
        timestamp: item.created_at,
        details: item.description ? `"${item.description}" added to inventory` : "Item added to inventory",
      });
    }

    // Edited event (if updated_at differs from created_at by more than 1 second)
    if (item.updated_at && item.created_at) {
      const created = new Date(item.created_at).getTime();
      const updated = new Date(item.updated_at).getTime();
      if (updated - created > 1000) {
        list.push({
          id: "edited",
          type: "edited",
          timestamp: item.updated_at,
          details: "Item details updated",
        });
      }
    }

    // Checkout/return events
    (history || []).forEach(record => {
      const employeeName = employeeMap.get(record.employee_id) || "Unknown";

      list.push({
        id: `checkout-${record.id}`,
        type: "checked_out",
        timestamp: record.checked_out_at,
        actor: employeeName,
        details: `${record.checked_out_quantity} unit${record.checked_out_quantity > 1 ? "s" : ""} checked out to ${employeeName}`,
      });

      if (record.checked_in_at) {
        list.push({
          id: `return-${record.id}`,
          type: "returned",
          timestamp: record.checked_in_at,
          actor: employeeName,
          details: `${record.checked_out_quantity} unit${record.checked_out_quantity > 1 ? "s" : ""} returned by ${employeeName}${record.return_condition ? ` (${record.return_condition})` : ""}`,
        });
      }
    });

    // Sort chronologically (newest first)
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return list;
  }, [item, history, employeeMap]);

  if (loading) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No history recorded yet</p>
      </div>
    );
  }

  return (
    <div className="relative py-2">
      {/* Timeline line */}
      <div className="absolute left-[15px] top-6 bottom-6 w-px bg-border" />

      <div className="space-y-1">
        {events.map((event) => {
          const config = EVENT_CONFIG[event.type];
          const Icon = config.icon;

          return (
            <div key={event.id} className="relative flex gap-3 py-2.5 pl-0">
              {/* Icon */}
              <div className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                config.color
              )}>
                <Icon className="h-3.5 w-3.5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{config.label}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                  </span>
                </div>
                {event.details && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {event.details}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-0.5 tabular-nums">
                  {format(new Date(event.timestamp), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
