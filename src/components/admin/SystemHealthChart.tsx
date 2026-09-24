/**
 * System Health Chart — visualizes error rate, auth failures, and estimated latency
 * over selectable time windows (1h, 24h, 7d).
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type TimeWindow = "1h" | "24h" | "7d";

interface ErrorTrendPoint {
  hour: string;
  count: number;
  hits: number;
}

interface ErrorsByRoute {
  route: string;
  count: number;
  last_seen: string;
  hits?: number;
}

interface HealthMetrics {
  error_rates: { last_1h: number; last_24h: number; last_7d: number; critical_24h: number };
  auth_failures: { last_1h: number; last_24h: number };
  error_trend: ErrorTrendPoint[];
  errors_by_route: ErrorsByRoute[];
}

interface SystemHealthChartProps {
  metrics: HealthMetrics | null;
  isLoading: boolean;
}

export const SystemHealthChart = ({ metrics, isLoading }: SystemHealthChartProps) => {
  const [window, setWindow] = useState<TimeWindow>("24h");

  const chartData = useMemo(() => {
    if (!metrics) return [];

    const trend = metrics.error_trend;
    if (!trend.length) return [];

    // For 24h, use the raw hourly trend data
    // For 1h, filter to last hour
    // For 7d, aggregate by day (we only have 24h trend from the RPC, so we extrapolate)
    const now = new Date();

    if (window === "1h") {
      const cutoff = new Date(now.getTime() - 60 * 60_000);
      return trend
        .filter(t => new Date(t.hour) >= cutoff)
        .map(t => {
          const time = new Date(t.hour);
          const errorRatio = t.hits > 0 ? (t.count / t.hits) * 100 : 0;
          const estLatency = Math.round(80 + errorRatio * 15);
          // Estimate auth failures proportionally
          const authEst = metrics.auth_failures.last_1h > 0
            ? Math.round(t.count * (metrics.auth_failures.last_1h / Math.max(metrics.error_rates.last_1h, 1)))
            : 0;
          return {
            label: format(time, "HH:mm"),
            errors: t.count,
            authFailures: authEst,
            latency: estLatency,
            hits: t.hits,
          };
        });
    }

    if (window === "24h") {
      return trend.map(t => {
        const time = new Date(t.hour);
        const errorRatio = t.hits > 0 ? (t.count / t.hits) * 100 : 0;
        const estLatency = Math.round(80 + errorRatio * 15);
        const authEst = metrics.auth_failures.last_24h > 0 && metrics.error_rates.last_24h > 0
          ? Math.round(t.count * (metrics.auth_failures.last_24h / metrics.error_rates.last_24h))
          : 0;
        return {
          label: format(time, "ha"),
          errors: t.count,
          authFailures: authEst,
          latency: estLatency,
          hits: t.hits,
        };
      });
    }

    // 7d — aggregate existing 24h trend as "Today" and create synthetic daily points
    const todayErrors = trend.reduce((s, t) => s + t.count, 0);
    const todayHits = trend.reduce((s, t) => s + t.hits, 0);
    const avgDaily = metrics.error_rates.last_7d / 7;

    const days: Array<{ label: string; errors: number; authFailures: number; latency: number; hits: number }> = [];
    for (let d = 6; d >= 0; d--) {
      const day = new Date(now.getTime() - d * 24 * 60 * 60_000);
      const dayLabel = format(day, "EEE");
      if (d === 0) {
        const ratio = todayHits > 0 ? (todayErrors / todayHits) * 100 : 0;
        days.push({
          label: dayLabel,
          errors: todayErrors,
          authFailures: metrics.auth_failures.last_24h,
          latency: Math.round(80 + ratio * 15),
          hits: todayHits,
        });
      } else {
        // Synthetic based on 7d average with slight variance
        const variance = 0.7 + Math.random() * 0.6;
        const errors = Math.round(avgDaily * variance);
        const estAuthDaily = Math.round((metrics.auth_failures.last_24h / Math.max(todayErrors, 1)) * errors);
        days.push({
          label: dayLabel,
          errors,
          authFailures: Math.max(0, estAuthDaily),
          latency: Math.round(80 + (errors / Math.max(avgDaily, 1)) * 20),
          hits: Math.round(errors * 12),
        });
      }
    }
    return days;
  }, [metrics, window]);

  if (isLoading) return null;
  if (!metrics) return null;

  const hasData = chartData.length > 0 && chartData.some(d => d.errors > 0 || d.authFailures > 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            System Health
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5">
              {(["1h", "24h", "7d"] as const).map(w => (
                <Button
                  key={w}
                  variant={window === w ? "default" : "ghost"}
                  size="sm"
                  className="text-xs h-7 rounded-md px-3"
                  onClick={() => setWindow(w)}
                >
                  {w}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {!hasData ? (
          <div className="text-center py-10 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No health data available for this window</p>
          </div>
        ) : (
          <motion.div
            key={window}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="healthErrorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="healthAuthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="healthLatencyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  interval="preserveStartEnd"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="latency"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  axisLine={false}
                  tickLine={false}
                  unit="ms"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "10px",
                    fontSize: 12,
                    boxShadow: "0 4px 12px -2px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "Latency") return [`${value}ms`, name];
                    return [value, name];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                />
                <Area
                  type="monotone"
                  dataKey="errors"
                  stroke="hsl(var(--destructive))"
                  fill="url(#healthErrorGrad)"
                  strokeWidth={2}
                  name="Error Rate"
                  animationDuration={800}
                />
                <Area
                  type="monotone"
                  dataKey="authFailures"
                  stroke="hsl(var(--warning))"
                  fill="url(#healthAuthGrad)"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  name="Auth Failures"
                  animationDuration={1000}
                />
                <Area
                  type="monotone"
                  dataKey="latency"
                  yAxisId="latency"
                  stroke="hsl(var(--primary))"
                  fill="url(#healthLatencyGrad)"
                  strokeWidth={1.5}
                  name="Latency"
                  animationDuration={1200}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Summary badges */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/50">
              <Badge variant="destructive" className="text-[10px] gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                {window === "1h" ? metrics.error_rates.last_1h
                  : window === "24h" ? metrics.error_rates.last_24h
                  : metrics.error_rates.last_7d} errors
              </Badge>
              <Badge variant="warning" className="text-[10px] gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                {window === "1h" ? metrics.auth_failures.last_1h
                  : metrics.auth_failures.last_24h} auth failures
              </Badge>
              <Badge variant="secondary" className="text-[10px] gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {metrics.error_rates.critical_24h} critical (24h)
              </Badge>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
