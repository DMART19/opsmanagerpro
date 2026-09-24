/**
 * SystemReliabilityPanel — Monitors API latency, error rates, and endpoint performance.
 * Uses client-side performance data + server-side error_logs for a full picture.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getReliabilitySummary,
  aggregateByEndpoint,
  getLatencyTrend,
  type EndpointStats,
  type ReliabilitySummary,
  type LatencyBucket,
} from "@/lib/api-performance-tracker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  Gauge,
  AlertTriangle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Server,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const TIME_WINDOWS = [
  { label: "Last 15 min", value: 900_000 },
  { label: "Last 1 hour", value: 3_600_000 },
  { label: "Last 4 hours", value: 14_400_000 },
] as const;

// Health indicator for latency
const getLatencyHealth = (ms: number) => {
  if (ms <= 100) return { label: "Excellent", color: "text-green-600", bg: "bg-green-500/10" };
  if (ms <= 300) return { label: "Good", color: "text-primary", bg: "bg-primary/10" };
  if (ms <= 500) return { label: "Fair", color: "text-yellow-600", bg: "bg-yellow-500/10" };
  return { label: "Slow", color: "text-destructive", bg: "bg-destructive/10" };
};

const getErrorRateHealth = (rate: number) => {
  if (rate <= 1) return { label: "Healthy", color: "text-green-600", bg: "bg-green-500/10" };
  if (rate <= 5) return { label: "Elevated", color: "text-yellow-600", bg: "bg-yellow-500/10" };
  return { label: "Critical", color: "text-destructive", bg: "bg-destructive/10" };
};

const formatMs = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

export const SystemReliabilityPanel = () => {
  const [timeWindow, setTimeWindow] = useState(3_600_000);
  const [refreshKey, setRefreshKey] = useState(0);

  // Client-side metrics (in-memory)
  const clientMetrics = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    refreshKey; // Force recalculation on refresh
    return {
      summary: getReliabilitySummary(timeWindow),
      endpoints: aggregateByEndpoint(timeWindow),
      trend: getLatencyTrend(timeWindow, timeWindow <= 900_000 ? 60_000 : 300_000),
    };
  }, [timeWindow, refreshKey]);

  // Server-side error rates from error_logs (last 24h grouped by endpoint)
  const { data: serverErrors, isLoading: serverLoading } = useQuery({
    queryKey: ["reliability-server-errors", refreshKey],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("error_logs")
        .select("api_endpoint, api_status_code, request_method, hit_count, last_seen_at")
        .not("api_endpoint", "is", null)
        .gte("last_seen_at", cutoff)
        .order("hit_count", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Aggregate by endpoint
      const grouped = new Map<string, { hits: number; methods: Set<string>; statusCodes: Set<number>; lastSeen: string }>();
      for (const row of data || []) {
        const key = row.api_endpoint || "unknown";
        const existing = grouped.get(key) || { hits: 0, methods: new Set(), statusCodes: new Set(), lastSeen: "" };
        existing.hits += row.hit_count || 1;
        if (row.request_method) existing.methods.add(row.request_method);
        if (row.api_status_code) existing.statusCodes.add(row.api_status_code);
        if (!existing.lastSeen || row.last_seen_at > existing.lastSeen) existing.lastSeen = row.last_seen_at;
        grouped.set(key, existing);
      }

      return Array.from(grouped.entries()).map(([endpoint, stats]) => ({
        endpoint,
        totalHits: stats.hits,
        methods: Array.from(stats.methods),
        statusCodes: Array.from(stats.statusCodes),
        lastSeen: stats.lastSeen,
      })).sort((a, b) => b.totalHits - a.totalHits);
    },
    staleTime: 30_000,
  });

  const { summary, endpoints, trend } = clientMetrics;
  const latencyHealth = getLatencyHealth(summary.avgLatency);
  const errorHealth = getErrorRateHealth(summary.overallErrorRate);

  const handleRefresh = () => setRefreshKey(k => k + 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Gauge}
          label="Avg Latency"
          value={summary.totalCalls > 0 ? formatMs(summary.avgLatency) : "—"}
          sublabel={summary.totalCalls > 0 ? `P95: ${formatMs(summary.p95Latency)}` : "No data yet"}
          health={latencyHealth}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Error Rate"
          value={summary.totalCalls > 0 ? `${summary.overallErrorRate.toFixed(1)}%` : "—"}
          sublabel={`${summary.totalErrors} errors / ${summary.totalCalls} calls`}
          health={errorHealth}
        />
        <SummaryCard
          icon={Activity}
          label="Total API Calls"
          value={summary.totalCalls.toLocaleString()}
          sublabel={`In selected window`}
          health={{ label: "Active", color: "text-primary", bg: "bg-primary/10" }}
        />
        <SummaryCard
          icon={Server}
          label="Slow Endpoints"
          value={String(summary.slowEndpoints.length)}
          sublabel={summary.slowEndpoints.length > 0 ? `P95 > 500ms` : "All within SLA"}
          health={summary.slowEndpoints.length > 0
            ? { label: "Warning", color: "text-yellow-600", bg: "bg-yellow-500/10" }
            : { label: "Healthy", color: "text-green-600", bg: "bg-green-500/10" }
          }
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={String(timeWindow)} onValueChange={(v) => setTimeWindow(Number(v))}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_WINDOWS.map(tw => (
                <SelectItem key={tw.value} value={String(tw.value)}>{tw.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Latency Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Latency Trend
          </CardTitle>
          <CardDescription>Average API response time over the selected window</CardDescription>
        </CardHeader>
        <CardContent>
          {trend.length === 0 || trend.every(t => t.callCount === 0) ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              <Zap className="h-5 w-5 mr-2" />
              No API calls recorded yet. Data will appear as the app is used.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => [
                    name === "avgLatency" ? `${value}ms` : value,
                    name === "avgLatency" ? "Avg Latency" : name === "callCount" ? "Calls" : "Errors",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="avgLatency"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#latencyGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Two-column: Endpoint Performance + Server-Side Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client-Side Endpoint Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Endpoint Performance
            </CardTitle>
            <CardDescription>Live client-side latency and error rates</CardDescription>
          </CardHeader>
          <CardContent>
            {endpoints.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No endpoint data yet. Metrics populate as API calls are made.
              </p>
            ) : (
              <div className="rounded-md border max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint</TableHead>
                      <TableHead className="text-right">Calls</TableHead>
                      <TableHead className="text-right">Avg</TableHead>
                      <TableHead className="text-right">P95</TableHead>
                      <TableHead className="text-right">Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {endpoints.slice(0, 20).map((ep) => {
                      const latH = getLatencyHealth(ep.p95Latency);
                      return (
                        <TableRow key={ep.endpoint}>
                          <TableCell className="font-mono text-xs max-w-[180px] truncate">
                            {ep.endpoint}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{ep.totalCalls}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{formatMs(ep.avgLatency)}</TableCell>
                          <TableCell className={cn("text-right text-xs tabular-nums font-medium", latH.color)}>
                            {formatMs(ep.p95Latency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {ep.errorCount > 0 ? (
                              <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">
                                {ep.errorCount} ({ep.errorRate.toFixed(0)}%)
                              </Badge>
                            ) : (
                              <span className="text-xs text-green-600">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Server-Side Error Hotspots */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Error Hotspots (24h)
            </CardTitle>
            <CardDescription>Server-side errors aggregated from error logs</CardDescription>
          </CardHeader>
          <CardContent>
            {serverLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : !serverErrors || serverErrors.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No API errors in the last 24 hours</p>
              </div>
            ) : (
              <div className="rounded-md border max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint</TableHead>
                      <TableHead className="text-right">Hits</TableHead>
                      <TableHead>Status Codes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serverErrors.map((err, i) => (
                      <TableRow key={`${err.endpoint}-${i}`}>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {err.methods.join(",")} {err.endpoint}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums font-medium text-destructive">
                          {err.totalHits}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {err.statusCodes.map(code => (
                              <Badge
                                key={code}
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  code >= 500 ? "text-destructive border-destructive/30" : "text-yellow-600 border-yellow-500/30"
                                )}
                              >
                                {code}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Slow Endpoints Alert Bar */}
      {summary.slowEndpoints.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-600">
              <TrendingDown className="h-4 w-4" />
              Slow Endpoints Detected
            </CardTitle>
            <CardDescription>These endpoints have P95 latency above 500ms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.slowEndpoints.map(ep => (
                <div key={ep.endpoint} className="flex items-center justify-between rounded-lg border bg-background p-3">
                  <span className="font-mono text-xs">{ep.endpoint}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{ep.totalCalls} calls</span>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">
                      P95: {formatMs(ep.p95Latency)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* High Error Rate Alert Bar */}
      {summary.highErrorEndpoints.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              High Error Rate Endpoints
            </CardTitle>
            <CardDescription>These endpoints have error rates above 5%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.highErrorEndpoints.map(ep => (
                <div key={ep.endpoint} className="flex items-center justify-between rounded-lg border bg-background p-3">
                  <span className="font-mono text-xs">{ep.endpoint}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{ep.errorCount}/{ep.totalCalls} failed</span>
                    <Badge variant="outline" className="text-destructive border-destructive/30">
                      {ep.errorRate.toFixed(1)}% errors
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── Summary Card ───
const SummaryCard = ({
  icon: Icon,
  label,
  value,
  sublabel,
  health,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sublabel: string;
  health: { label: string; color: string; bg: string };
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", health.bg)}>
            <Icon className={cn("h-5 w-5", health.color)} />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
        <Badge variant="outline" className={cn("text-xs", health.color)}>
          {health.label}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{sublabel}</p>
    </CardContent>
  </Card>
);
