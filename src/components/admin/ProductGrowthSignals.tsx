/**
 * Product Growth Signals – weekly activity trends from product_events.
 * Subscribes to realtime for live updates.
 */
import { useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Package, Box, Users, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { startOfWeek, subWeeks, isAfter } from "date-fns";
import { cn } from "@/lib/utils";

const SIGNAL_CONFIG = [
  { event: "asset_created", label: "Assets Added", icon: Package },
  { event: "container_created", label: "Containers Created", icon: Box },
  { event: "team_member_added", label: "Team Members Added", icon: Users },
  { event: "pallet_saved", label: "Pallets Saved", icon: Package },
  { event: "calendar_event_created", label: "Events Created", icon: Package },
];

export const ProductGrowthSignals = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["product-growth-signals"],
    queryFn: async () => {
      const twoWeeksAgo = subWeeks(new Date(), 2).toISOString();
      const { data, error } = await supabase
        .from("product_events")
        .select("event_type, created_at")
        .gte("created_at", twoWeeksAgo)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // Realtime: invalidate on new product_events
  useEffect(() => {
    const channel = supabase
      .channel("growth-signals-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "product_events" }, () => {
        queryClient.invalidateQueries({ queryKey: ["product-growth-signals"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const signals = useMemo(() => {
    if (!data?.length) return [];
    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = subWeeks(thisWeekStart, 1);

    return SIGNAL_CONFIG.map(({ event, label, icon }) => {
      const thisWeek = data.filter(
        (d) => d.event_type === event && isAfter(new Date(d.created_at), thisWeekStart)
      ).length;
      const lastWeek = data.filter(
        (d) =>
          d.event_type === event &&
          isAfter(new Date(d.created_at), lastWeekStart) &&
          !isAfter(new Date(d.created_at), thisWeekStart)
      ).length;
      const change =
        lastWeek === 0
          ? thisWeek > 0
            ? 100
            : 0
          : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
      return { label, icon, thisWeek, lastWeek, change };
    });
  }, [data]);

  if (isLoading)
    return (
      <Card>
        <CardContent className="py-8">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );

  const totalThisWeek = signals.reduce((s, g) => s + g.thisWeek, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Product Growth Signals
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {totalThisWeek} events this week
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {signals.every((s) => s.thisWeek === 0 && s.lastWeek === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No activity recorded in the last 2 weeks.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {signals.map((s) => {
              const Icon = s.icon;
              const TrendIcon =
                s.change > 0 ? ArrowUpRight : s.change < 0 ? ArrowDownRight : Minus;
              return (
                <div
                  key={s.label}
                  className="rounded-xl border border-border/50 p-3 space-y-1.5"
                >
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-medium truncate">{s.label}</span>
                  </div>
                  <p className="text-xl font-bold">{s.thisWeek}</p>
                  <div className="flex items-center gap-1">
                    <TrendIcon
                      className={cn(
                        "h-3 w-3",
                        s.change > 0
                          ? "text-green-500"
                          : s.change < 0
                          ? "text-red-500"
                          : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        s.change > 0
                          ? "text-green-600"
                          : s.change < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                      )}
                    >
                      {s.change > 0 ? "+" : ""}
                      {s.change}% vs last week
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
