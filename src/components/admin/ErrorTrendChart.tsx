import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, subHours, subDays, startOfMinute, startOfHour, startOfDay, eachMinuteOfInterval, eachHourOfInterval, eachDayOfInterval } from "date-fns";
import { motion } from "framer-motion";
import type { ErrorLog } from "@/hooks/use-error-logs";

type Granularity = "minute" | "hour" | "day";

interface ErrorTrendChartProps {
  errors: ErrorLog[];
  isLoading: boolean;
}

export const ErrorTrendChart = ({ errors, isLoading }: ErrorTrendChartProps) => {
  const [granularity, setGranularity] = useState<Granularity>("hour");

  const chartData = useMemo(() => {
    if (!errors?.length) return [];

    const now = new Date();
    let start: Date;
    let buckets: Date[];
    let bucketFn: (d: Date) => string;
    let labelFn: (d: Date) => string;

    if (granularity === "minute") {
      start = subHours(now, 1);
      buckets = eachMinuteOfInterval({ start, end: now });
      bucketFn = (d) => startOfMinute(d).toISOString();
      labelFn = (d) => format(d, "h:mm a");
    } else if (granularity === "hour") {
      start = subHours(now, 24);
      buckets = eachHourOfInterval({ start, end: now });
      bucketFn = (d) => startOfHour(d).toISOString();
      labelFn = (d) => format(d, "ha");
    } else {
      start = subDays(now, 30);
      buckets = eachDayOfInterval({ start, end: now });
      bucketFn = (d) => startOfDay(d).toISOString();
      labelFn = (d) => format(d, "MMM d");
    }

    const map = new Map<string, { time: Date; errors: number; critical: number }>();
    buckets.forEach((b) => {
      map.set(b.toISOString(), { time: b, errors: 0, critical: 0 });
    });

    errors.forEach((err) => {
      // Use last_seen_at for bucketing — matches dedup model where
      // the same error can recur across multiple time windows
      const errDate = new Date(err.last_seen_at);
      if (errDate < start) return;
      const key = bucketFn(errDate);
      const bucket = map.get(key);
      if (bucket) {
        bucket.errors += err.hit_count;
        if (err.severity === "critical") bucket.critical += err.hit_count;
      }
    });

    return Array.from(map.values()).map((b) => ({
      label: labelFn(b.time),
      errors: b.errors,
      critical: b.critical,
    }));
  }, [errors, granularity]);

  if (isLoading) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5" />
            Error Trends
          </CardTitle>
          <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
            {(["minute", "hour", "day"] as const).map((g) => (
              <Button
                key={g}
                variant={granularity === g ? "default" : "ghost"}
                size="sm"
                className="text-xs h-7 rounded-md"
                onClick={() => setGranularity(g)}
              >
                {g === "minute" ? "1h" : g === "hour" ? "24h" : "30d"}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No trend data available</p>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="criticalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  interval="preserveStartEnd"
                  tickCount={granularity === "minute" ? 6 : undefined}
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "10px",
                    fontSize: 12,
                    boxShadow: "0 4px 12px -2px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="errors"
                  stroke="hsl(var(--destructive))"
                  fill="url(#errorGrad)"
                  strokeWidth={2}
                  name="All Errors"
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                <Area
                  type="monotone"
                  dataKey="critical"
                  stroke="hsl(var(--destructive))"
                  fill="url(#criticalGrad)"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  name="Critical"
                  animationDuration={1400}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
