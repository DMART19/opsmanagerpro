/**
 * Predictive Alerts – analyzes patterns to forecast upcoming issues.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Package,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { subHours, subDays, differenceInDays } from "date-fns";
import type { ErrorLog } from "@/hooks/use-error-logs";

interface PredictiveAlert {
  id: string;
  title: string;
  description: string;
  category: "error_trend" | "credential_expiry" | "inventory" | "growth" | "performance";
  confidence: "high" | "medium" | "low";
  urgency: "immediate" | "soon" | "watch";
  icon: React.ElementType;
}

export const PredictiveAlerts = ({ errors }: { errors: ErrorLog[] }) => {
  // Fetch credentials approaching expiry
  const { data: credentialData } = useQuery({
    queryKey: ["predictive-credentials"],
    queryFn: async () => {
      const thirtyDaysOut = new Date();
      thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
      const { data } = await (supabase as any)
        .from("employee_requirements")
        .select("id, expire_date, status, requirement_id")
        .lt("expire_date", thirtyDaysOut.toISOString())
        .gt("expire_date", new Date().toISOString())
        .limit(100);
      return data as { id: string; expire_date: string; status: string }[] || [];
    },
    staleTime: 120_000,
    gcTime: 5 * 60_000,
  });

  // Fetch low stock items
  const { data: inventoryData } = useQuery({
    queryKey: ["predictive-inventory"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("cache_inventory")
        .select("id, description, quantity_available, low_stock_threshold, critical_stock_threshold")
        .not("low_stock_threshold", "is", null)
        .limit(200);
      return data as {
        id: string;
        description: string;
        quantity_available: number | null;
        low_stock_threshold: number | null;
        critical_stock_threshold: number | null;
      }[] || [];
    },
    staleTime: 120_000,
    gcTime: 5 * 60_000,
  });

  // Fetch recent performance data
  const { data: perfData } = useQuery({
    queryKey: ["predictive-perf"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("page_performance")
        .select("page_route, load_time_ms, created_at")
        .gte("created_at", subDays(new Date(), 7).toISOString())
        .order("created_at", { ascending: false })
        .limit(2000);
      return data as { page_route: string; load_time_ms: number; created_at: string }[] || [];
    },
    staleTime: 120_000,
    gcTime: 5 * 60_000,
  });

  const alerts = useMemo(() => {
    const result: PredictiveAlert[] = [];

    // 1. Error frequency acceleration
    if (errors?.length) {
      const now = new Date();
      const last6h = subHours(now, 6);
      const prev6h = subHours(now, 12);

      const recentErrors = errors.filter((e) => new Date(e.last_seen_at) > last6h);
      const prevErrors = errors.filter(
        (e) => new Date(e.last_seen_at) > prev6h && new Date(e.last_seen_at) <= last6h
      );

      const recentHits = recentErrors.reduce((s, e) => s + e.hit_count, 0);
      const prevHits = prevErrors.reduce((s, e) => s + e.hit_count, 0);

      if (recentHits > prevHits * 2 && recentHits >= 5) {
        result.push({
          id: "error-acceleration",
          title: "Error frequency increasing",
          description: `${recentHits} error hits in the last 6 hours vs ${prevHits} in the prior period. Error rate may be accelerating.`,
          category: "error_trend",
          confidence: recentHits > prevHits * 3 ? "high" : "medium",
          urgency: recentHits > 20 ? "immediate" : "soon",
          icon: TrendingUp,
        });
      }

      // New error patterns appearing
      const last24h = subHours(now, 24);
      const newErrors = errors.filter(
        (e) =>
          new Date(e.created_at) > last24h &&
          e.status === "unresolved" &&
          e.hit_count <= 3
      );
      if (newErrors.length >= 3) {
        result.push({
          id: "new-error-patterns",
          title: `${newErrors.length} new error patterns detected`,
          description: "Multiple new error types appeared in the last 24 hours. This may indicate a recent deployment issue or environmental change.",
          category: "error_trend",
          confidence: "medium",
          urgency: "soon",
          icon: AlertTriangle,
        });
      }
    }

    // 2. Credential expiry predictions
    const creds = credentialData || [];
    const expiringIn7Days = creds.filter((c) => differenceInDays(new Date(c.expire_date), new Date()) <= 7);
    const expiringIn30Days = creds.filter((c) => differenceInDays(new Date(c.expire_date), new Date()) <= 30);

    if (expiringIn7Days.length > 0) {
      result.push({
        id: "creds-7day",
        title: `${expiringIn7Days.length} credential${expiringIn7Days.length > 1 ? "s" : ""} expiring within 7 days`,
        description: "Team member credentials are about to expire. Renew them to avoid compliance gaps.",
        category: "credential_expiry",
        confidence: "high",
        urgency: "immediate",
        icon: ShieldAlert,
      });
    } else if (expiringIn30Days.length > 0) {
      result.push({
        id: "creds-30day",
        title: `${expiringIn30Days.length} credential${expiringIn30Days.length > 1 ? "s" : ""} expiring within 30 days`,
        description: "Plan ahead to renew upcoming credentials before they expire.",
        category: "credential_expiry",
        confidence: "high",
        urgency: "soon",
        icon: ShieldAlert,
      });
    }

    // 3. Inventory predictions
    const inventory = inventoryData || [];
    const lowStock = inventory.filter(
      (i) =>
        i.quantity_available !== null &&
        i.low_stock_threshold !== null &&
        i.quantity_available <= i.low_stock_threshold
    );
    const criticalStock = inventory.filter(
      (i) =>
        i.quantity_available !== null &&
        i.critical_stock_threshold !== null &&
        i.quantity_available <= i.critical_stock_threshold
    );

    if (criticalStock.length > 0) {
      result.push({
        id: "critical-stock",
        title: `${criticalStock.length} item${criticalStock.length > 1 ? "s" : ""} at critical stock`,
        description: "Inventory items have fallen below critical thresholds and need immediate restocking.",
        category: "inventory",
        confidence: "high",
        urgency: "immediate",
        icon: Package,
      });
    } else if (lowStock.length > 0) {
      result.push({
        id: "low-stock",
        title: `${lowStock.length} item${lowStock.length > 1 ? "s" : ""} approaching low stock`,
        description: "Inventory items are at or below low stock thresholds. Consider restocking soon.",
        category: "inventory",
        confidence: "medium",
        urgency: "soon",
        icon: Package,
      });
    }

    // 4. Performance degradation trends
    const perf = perfData || [];
    if (perf.length >= 10) {
      const routeTimes = new Map<string, { recent: number[]; older: number[] }>();
      const midpoint = subDays(new Date(), 3);
      perf.forEach((p) => {
        const bucket = routeTimes.get(p.page_route) || { recent: [], older: [] };
        if (new Date(p.created_at) > midpoint) {
          bucket.recent.push(p.load_time_ms);
        } else {
          bucket.older.push(p.load_time_ms);
        }
        routeTimes.set(p.page_route, bucket);
      });

      const degrading: string[] = [];
      routeTimes.forEach((bucket, route) => {
        if (bucket.recent.length >= 3 && bucket.older.length >= 3) {
          const recentAvg = bucket.recent.reduce((s, t) => s + t, 0) / bucket.recent.length;
          const olderAvg = bucket.older.reduce((s, t) => s + t, 0) / bucket.older.length;
          if (recentAvg > olderAvg * 1.5 && recentAvg > 2000) {
            degrading.push(route);
          }
        }
      });

      if (degrading.length > 0) {
        result.push({
          id: "perf-degradation",
          title: `Performance degrading on ${degrading.length} page${degrading.length > 1 ? "s" : ""}`,
          description: `Load times increasing on: ${degrading.join(", ")}. Investigate recent changes that may impact performance.`,
          category: "performance",
          confidence: "medium",
          urgency: "soon",
          icon: Clock,
        });
      }
    }

    // Sort by urgency
    const urgencyOrder = { immediate: 0, soon: 1, watch: 2 };
    return result.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  }, [errors, credentialData, inventoryData, perfData]);

  const urgencyColors = {
    immediate: "text-red-600 bg-red-500/10 border-red-500/30",
    soon: "text-yellow-600 bg-yellow-500/10 border-yellow-500/30",
    watch: "text-blue-600 bg-blue-500/10 border-blue-500/30",
  };

  const confidenceColors = {
    high: "text-green-600",
    medium: "text-yellow-600",
    low: "text-muted-foreground",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" /> Predictive Alerts
            {alerts.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Pattern-based forecasting
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No predictive alerts. The system monitors error trends, credential
            expirations, inventory levels, and performance patterns.
          </p>
        ) : (
          <div className="space-y-2.5">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "rounded-xl border p-3.5 space-y-1.5",
                    alert.urgency === "immediate"
                      ? "border-red-500/20 bg-red-500/[0.02]"
                      : "border-border/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 mt-0.5",
                        alert.urgency === "immediate"
                          ? "text-red-500"
                          : alert.urgency === "soon"
                          ? "text-yellow-500"
                          : "text-blue-500"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {alert.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn("text-[9px]", urgencyColors[alert.urgency])}
                      >
                        {alert.urgency}
                      </Badge>
                      <span
                        className={cn(
                          "text-[9px] font-medium",
                          confidenceColors[alert.confidence]
                        )}
                      >
                        {alert.confidence}
                      </span>
                    </div>
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
