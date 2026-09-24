/**
 * Admin Product Events Dashboard
 * Shows aggregated event counts for key actions.
 * Uses realtime subscription for live updates.
 */

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  Box,
  Users,
  ShieldCheck,
  Layers,
  CalendarPlus,
  Activity,
} from "lucide-react";
import { startOfDay, startOfWeek } from "date-fns";

const EVENT_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  asset_created: { label: "Assets Created", icon: Package, color: "text-blue-500" },
  container_created: { label: "Containers Created", icon: Box, color: "text-amber-500" },
  team_member_added: { label: "Team Members Added", icon: Users, color: "text-green-500" },
  credential_added: { label: "Credentials Added", icon: ShieldCheck, color: "text-purple-500" },
  pallet_saved: { label: "Pallets Saved", icon: Layers, color: "text-orange-500" },
  calendar_event_created: { label: "Calendar Events", icon: CalendarPlus, color: "text-cyan-500" },
};

const useEventCounts = (since: string) => {
  return useQuery({
    queryKey: ["product-event-counts", since],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("product_events")
        .select("event_type")
        .gte("created_at", since);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.event_type] = (counts[row.event_type] || 0) + 1;
      }
      return counts;
    },
    staleTime: 15_000,
  });
};

export const ProductEventsDashboard = () => {
  const queryClient = useQueryClient();
  const todayStr = startOfDay(new Date()).toISOString();
  const weekStr = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();

  const { data: todayCounts, isLoading: loadingToday } = useEventCounts(todayStr);
  const { data: weekCounts, isLoading: loadingWeek } = useEventCounts(weekStr);

  // Realtime: invalidate on new product_events
  useEffect(() => {
    const channel = supabase
      .channel("product-events-dashboard-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "product_events" }, () => {
        queryClient.invalidateQueries({ queryKey: ["product-event-counts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const eventTypes = Object.keys(EVENT_META);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Product Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {eventTypes.map((type) => {
            const meta = EVENT_META[type];
            const Icon = meta.icon;
            const today = todayCounts?.[type] ?? 0;
            const week = weekCounts?.[type] ?? 0;

            return (
              <div
                key={type}
                className="flex flex-col gap-1 rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                  <span className="text-xs font-medium text-muted-foreground truncate">
                    {meta.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  {loadingToday ? (
                    <Skeleton className="h-6 w-8" />
                  ) : (
                    <span className="text-xl font-bold">{today}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">today</span>
                </div>
                <div className="flex items-baseline gap-2">
                  {loadingWeek ? (
                    <Skeleton className="h-4 w-6" />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">
                      {week}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">this week</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
