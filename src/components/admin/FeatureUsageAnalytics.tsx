/**
 * Feature Usage Analytics – tracks feature adoption by route/event.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/assets": "Assets",
  "/team": "Team",
  "/credentials": "Credentials",
  "/pallet-builder": "Pallet Builder",
  "/calendar": "Calendar",
  "/equipment": "Equipment",
  "/settings": "Settings",
  "/compliance": "Compliance",
};

export const FeatureUsageAnalytics = () => {
  const { data: events, isLoading } = useQuery({
    queryKey: ["feature-usage-analytics"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("product_events")
        .select("event_type, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data as { event_type: string; created_at: string }[];
    },
    staleTime: 5 * 60_000, // 5 min — analytics data
    gcTime: 10 * 60_000,
  });

  const { data: perfData } = useQuery({
    queryKey: ["page-perf-route-counts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("page_performance")
        .select("page_route")
        .limit(5000);
      if (error) throw error;
      return data as { page_route: string }[];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const analytics = useMemo(() => {
    // Use page_performance route visits as a proxy for feature usage
    const routeCounts: Record<string, number> = {};
    (perfData || []).forEach(p => {
      const r = p.page_route;
      if (r) routeCounts[r] = (routeCounts[r] || 0) + 1;
    });

    // Also use product_events
    const eventCounts: Record<string, number> = {};
    (events || []).forEach(e => {
      eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1;
    });

    const routes = Object.entries(routeCounts)
      .map(([route, count]) => ({
        route,
        label: ROUTE_LABELS[route] || route,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const maxCount = routes[0]?.count || 1;
    return { routes, eventCounts, maxCount };
  }, [events, perfData]);

  if (isLoading) return <Card><CardContent className="py-8"><Skeleton className="h-40 w-full" /></CardContent></Card>;

  const { routes, eventCounts, maxCount } = analytics;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Feature Usage Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {routes.length === 0 && Object.keys(eventCounts).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No usage data yet. Page visits and events will appear here.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Page visits */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Most Visited Pages
              </h4>
              <div className="space-y-2.5">
                {routes.slice(0, 8).map(r => (
                  <div key={r.route} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs">{r.label}</span>
                      <Badge variant="secondary" className="text-xs">{r.count}</Badge>
                    </div>
                    <Progress value={(r.count / maxCount) * 100} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>

            {/* Least used */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" /> Least Used Features
              </h4>
              {routes.length > 2 ? (
                <div className="space-y-2.5">
                  {routes.slice(-5).reverse().map(r => (
                    <div key={r.route} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span className="text-xs">{r.label}</span>
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-500/30">
                        {r.count} visits
                      </Badge>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground mt-1">Low usage may indicate poor discoverability.</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Insufficient data</p>
              )}
            </div>

            {/* Event type counts */}
            {Object.keys(eventCounts).length > 0 && (
              <div className="md:col-span-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Product Actions</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(eventCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <Badge key={type} variant="outline" className="text-xs gap-1.5 px-2.5 py-1">
                        {type.replace(/_/g, " ")} <span className="font-bold">{count}</span>
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
