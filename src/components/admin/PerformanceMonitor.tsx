/**
 * Performance Monitor – tracks page load times.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Gauge, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const SLOW_THRESHOLD = 3000; // 3s

export const PerformanceMonitor = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["page-performance-analytics"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("page_performance")
        .select("page_route, load_time_ms, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data as { page_route: string; load_time_ms: number; created_at: string }[];
    },
    staleTime: 30_000,
    gcTime: 120_000,
  });

  const analytics = useMemo(() => {
    if (!data?.length) return [];
    const routeMap = new Map<string, number[]>();
    data.forEach(d => {
      const arr = routeMap.get(d.page_route) || [];
      arr.push(d.load_time_ms);
      routeMap.set(d.page_route, arr);
    });

    return Array.from(routeMap.entries())
      .map(([route, times]) => {
        const avg = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
        const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)] || avg;
        return { route, avg, p95, count: times.length, isSlow: avg > SLOW_THRESHOLD };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [data]);

  if (isLoading) return <Card><CardContent className="py-8"><Skeleton className="h-40 w-full" /></CardContent></Card>;

  const maxAvg = Math.max(...analytics.map(a => a.avg), 1);
  const slowPages = analytics.filter(a => a.isSlow);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4" /> Performance Monitor
          {slowPages.length > 0 && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-500/30 gap-1">
              <AlertTriangle className="h-3 w-3" /> {slowPages.length} slow
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {analytics.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No performance data yet. Page load times will appear as users navigate.</p>
        ) : (
          <div className="space-y-3">
            {analytics.map(a => (
              <div key={a.route} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs truncate">{a.route}</span>
                    {a.isSlow && <AlertTriangle className="h-3 w-3 text-orange-500 shrink-0" />}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        a.avg <= 1000 ? "text-green-600 border-green-500/30" :
                        a.avg <= SLOW_THRESHOLD ? "text-yellow-600 border-yellow-500/30" :
                        "text-red-600 border-red-500/30"
                      )}
                    >
                      {(a.avg / 1000).toFixed(1)}s avg
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{a.count} samples</span>
                  </div>
                </div>
                <Progress
                  value={Math.min((a.avg / maxAvg) * 100, 100)}
                  className={cn("h-1.5", a.isSlow && "[&>div]:bg-orange-500")}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
