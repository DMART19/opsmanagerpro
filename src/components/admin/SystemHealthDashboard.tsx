/**
 * SystemHealthDashboard — Full platform monitoring panel for the Ops Control Center.
 * Derives all metrics from the existing error_logs table.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
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
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Clock,
  Database,
  Globe,
  Server,
  ShieldAlert,
  Zap,
  TrendingUp,
  XCircle,
  CheckCircle2,
  Flame,
} from "lucide-react";
import { isAfter, subHours, subMinutes, format, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "./AnimatedCounter";
import { motion } from "framer-motion";
import type { ErrorLog } from "@/hooks/use-error-logs";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

interface SystemHealthDashboardProps {
  errors: ErrorLog[];
  isLoading: boolean;
  onSelectError?: (error: ErrorLog) => void;
  onFilterByEndpoint?: (endpoint: string) => void;
  onFilterByPage?: (route: string) => void;
  onSwitchToErrors?: (filter?: string) => void;
}

// ─── Spike Detection ───
interface HealthSpike {
  type: "error_surge" | "endpoint_failure" | "page_degradation" | "auth_storm";
  severity: "critical" | "warning";
  title: string;
  detail: string;
  timestamp: Date;
}

// ─── Endpoint Metric ───
interface EndpointMetric {
  endpoint: string;
  method: string | null;
  totalHits: number;
  errorCount: number;
  errorRate: number;
  avgStatusCode: number;
  lastSeen: string;
  statusCodes: Map<number, number>;
}

// ─── Page Metric ───
interface PageMetric {
  route: string;
  errorCount: number;
  hitCount: number;
  criticalCount: number;
  uniqueUsers: number;
  trend: "up" | "down" | "stable";
}

export const SystemHealthDashboard = ({ errors, isLoading, onSelectError, onFilterByEndpoint, onFilterByPage, onSwitchToErrors }: SystemHealthDashboardProps) => {
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d">("24h");

  const cutoff = useMemo(() => {
    const now = new Date();
    switch (timeRange) {
      case "1h": return subHours(now, 1);
      case "6h": return subHours(now, 6);
      case "24h": return subHours(now, 24);
      case "7d": return subHours(now, 168);
    }
  }, [timeRange]);

  const filteredErrors = useMemo(() => {
    return errors.filter(e => isAfter(new Date(e.last_seen_at), cutoff));
  }, [errors, cutoff]);

  // ─── KPI Metrics ───
  const kpis = useMemo(() => {
    const now = new Date();
    const last15m = subMinutes(now, 15);
    const last1h = subHours(now, 1);

    const apiErrors = filteredErrors.filter(e => e.api_endpoint);
    const totalApiHits = apiErrors.reduce((s, e) => s + e.hit_count, 0);
    const errorRate = filteredErrors.length > 0
      ? Math.round((filteredErrors.filter(e => e.severity === "critical" || e.severity === "error").length / filteredErrors.length) * 100)
      : 0;

    const uniqueEndpoints = new Set(apiErrors.map(e => e.api_endpoint)).size;
    const failingEndpoints = new Set(
      apiErrors.filter(e => e.api_status_code && e.api_status_code >= 500).map(e => e.api_endpoint)
    ).size;

    const errorsLast15m = filteredErrors.filter(e => isAfter(new Date(e.last_seen_at), last15m));
    const errorsLastHour = filteredErrors.filter(e => isAfter(new Date(e.last_seen_at), last1h));

    const uniquePages = new Set(filteredErrors.map(e => e.page_route).filter(Boolean)).size;
    const affectedUsers = new Set(filteredErrors.filter(e => e.user_id).map(e => e.user_id)).size;

    return {
      totalErrors: filteredErrors.length,
      totalHits: filteredErrors.reduce((s, e) => s + e.hit_count, 0),
      errorRate,
      apiErrors: totalApiHits,
      uniqueEndpoints,
      failingEndpoints,
      errorsLast15m: errorsLast15m.length,
      errorsLastHour: errorsLastHour.length,
      uniquePages,
      affectedUsers,
      criticalCount: filteredErrors.filter(e => e.severity === "critical" && e.status === "unresolved").length,
    };
  }, [filteredErrors]);

  // ─── Endpoint Analysis ───
  const endpointMetrics = useMemo((): EndpointMetric[] => {
    const map = new Map<string, EndpointMetric>();

    filteredErrors.forEach(e => {
      if (!e.api_endpoint) return;
      const key = `${e.request_method || "GET"} ${e.api_endpoint}`;
      const existing = map.get(key) || {
        endpoint: e.api_endpoint,
        method: e.request_method,
        totalHits: 0,
        errorCount: 0,
        errorRate: 0,
        avgStatusCode: 0,
        lastSeen: e.last_seen_at,
        statusCodes: new Map<number, number>(),
      };

      existing.totalHits += e.hit_count;
      existing.errorCount += 1;
      if (e.api_status_code) {
        existing.statusCodes.set(
          e.api_status_code,
          (existing.statusCodes.get(e.api_status_code) || 0) + e.hit_count
        );
      }
      if (new Date(e.last_seen_at) > new Date(existing.lastSeen)) {
        existing.lastSeen = e.last_seen_at;
      }
      map.set(key, existing);
    });

    return Array.from(map.values())
      .map(m => ({
        ...m,
        errorRate: Math.round((m.errorCount / Math.max(m.totalHits, 1)) * 100),
        avgStatusCode: m.statusCodes.size > 0
          ? Math.round([...m.statusCodes.entries()].reduce((s, [code, count]) => s + code * count, 0) / m.totalHits)
          : 0,
      }))
      .sort((a, b) => b.totalHits - a.totalHits)
      .slice(0, 15);
  }, [filteredErrors]);

  // ─── Page Analysis ───
  const pageMetrics = useMemo((): PageMetric[] => {
    const now = new Date();
    const halfRange = differenceInMinutes(now, cutoff) / 2;
    const midpoint = subMinutes(now, halfRange);

    const map = new Map<string, { recent: number; older: number; total: number; hits: number; critical: number; users: Set<string> }>();

    filteredErrors.forEach(e => {
      if (!e.page_route) return;
      const existing = map.get(e.page_route) || { recent: 0, older: 0, total: 0, hits: 0, critical: 0, users: new Set<string>() };
      existing.total += 1;
      existing.hits += e.hit_count;
      if (e.severity === "critical") existing.critical += 1;
      if (e.user_id) existing.users.add(e.user_id);
      if (isAfter(new Date(e.last_seen_at), midpoint)) {
        existing.recent += 1;
      } else {
        existing.older += 1;
      }
      map.set(e.page_route, existing);
    });

    return Array.from(map.entries())
      .map(([route, data]) => ({
        route,
        errorCount: data.total,
        hitCount: data.hits,
        criticalCount: data.critical,
        uniqueUsers: data.users.size,
        trend: data.recent > data.older * 1.5 ? "up" as const : data.recent < data.older * 0.5 ? "down" as const : "stable" as const,
      }))
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, 10);
  }, [filteredErrors, cutoff]);

  // ─── Spike Detection ───
  const spikes = useMemo((): HealthSpike[] => {
    const result: HealthSpike[] = [];
    const now = new Date();
    const last15m = subMinutes(now, 15);
    const last1h = subHours(now, 1);

    // Error surge: >10 errors in 15 min
    const recent15m = filteredErrors.filter(e => isAfter(new Date(e.last_seen_at), last15m));
    const totalHits15m = recent15m.reduce((s, e) => s + e.hit_count, 0);
    if (totalHits15m >= 10) {
      result.push({
        type: "error_surge",
        severity: totalHits15m >= 25 ? "critical" : "warning",
        title: "Error Surge Detected",
        detail: `${totalHits15m} error hits in the last 15 minutes across ${recent15m.length} unique errors`,
        timestamp: now,
      });
    }

    // Endpoint failure: any endpoint with 5xx errors >= 5 hits
    const endpoint5xx = new Map<string, number>();
    filteredErrors.forEach(e => {
      if (e.api_endpoint && e.api_status_code && e.api_status_code >= 500) {
        endpoint5xx.set(e.api_endpoint, (endpoint5xx.get(e.api_endpoint) || 0) + e.hit_count);
      }
    });
    endpoint5xx.forEach((hits, endpoint) => {
      if (hits >= 5) {
        result.push({
          type: "endpoint_failure",
          severity: hits >= 15 ? "critical" : "warning",
          title: `Failing Endpoint: ${endpoint}`,
          detail: `${hits} server errors (5xx) recorded`,
          timestamp: now,
        });
      }
    });

    // Auth storm
    const authErrors = filteredErrors.filter(e =>
      isAfter(new Date(e.last_seen_at), last1h) &&
      (e.message.toLowerCase().includes("auth") || e.message.toLowerCase().includes("login") ||
       e.api_endpoint?.toLowerCase().includes("auth") || e.api_endpoint?.toLowerCase().includes("token"))
    );
    const authHits = authErrors.reduce((s, e) => s + e.hit_count, 0);
    if (authHits >= 10) {
      result.push({
        type: "auth_storm",
        severity: authHits >= 25 ? "critical" : "warning",
        title: "Auth Failure Storm",
        detail: `${authHits} authentication-related failures in the last hour`,
        timestamp: now,
      });
    }

    // Page degradation: any page with > 5 critical errors in timeframe
    pageMetrics.forEach(p => {
      if (p.criticalCount >= 5) {
        result.push({
          type: "page_degradation",
          severity: "warning",
          title: `Page Degradation: ${p.route}`,
          detail: `${p.criticalCount} critical errors affecting ${p.uniqueUsers} user${p.uniqueUsers !== 1 ? "s" : ""}`,
          timestamp: now,
        });
      }
    });

    return result.sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1));
  }, [filteredErrors, pageMetrics]);

  // ─── Error Timeline Chart ───
  const timelineData = useMemo(() => {
    const buckets = timeRange === "1h" ? 12 : timeRange === "6h" ? 24 : timeRange === "24h" ? 24 : 28;
    const bucketMinutes = timeRange === "1h" ? 5 : timeRange === "6h" ? 15 : timeRange === "24h" ? 60 : 360;
    const now = new Date();

    const data = Array.from({ length: buckets }, (_, i) => {
      const start = subMinutes(now, (buckets - i) * bucketMinutes);
      const end = subMinutes(now, (buckets - i - 1) * bucketMinutes);
      const label = timeRange === "7d"
        ? format(start, "MMM d")
        : format(start, "HH:mm");

      const bucketErrors = filteredErrors.filter(e => {
        const t = new Date(e.last_seen_at);
        return isAfter(t, start) && !isAfter(t, end);
      });

      return {
        time: label,
        errors: bucketErrors.reduce((s, e) => s + e.hit_count, 0),
        critical: bucketErrors.filter(e => e.severity === "critical").reduce((s, e) => s + e.hit_count, 0),
        api: bucketErrors.filter(e => e.api_endpoint).reduce((s, e) => s + e.hit_count, 0),
      };
    });

    return data;
  }, [filteredErrors, timeRange]);

  // ─── Status Code Distribution ───
  const statusCodeDist = useMemo(() => {
    const map = new Map<string, number>();
    filteredErrors.forEach(e => {
      if (!e.api_status_code) return;
      const group = `${Math.floor(e.api_status_code / 100)}xx`;
      map.set(group, (map.get(group) || 0) + e.hit_count);
    });
    return Array.from(map.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredErrors]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          System Health Monitor
        </h2>
        <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last 1 hour</SelectItem>
            <SelectItem value="6h">Last 6 hours</SelectItem>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Spike Alerts */}
      {spikes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {spikes.map((spike, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3",
                spike.severity === "critical"
                  ? "bg-destructive/5 border-destructive/20"
                  : "bg-warning/5 border-warning/20"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg mt-0.5",
                spike.severity === "critical" ? "bg-destructive/10" : "bg-warning/10"
              )}>
                {spike.type === "error_surge" && <Zap className={cn("h-4 w-4", spike.severity === "critical" ? "text-destructive" : "text-warning")} />}
                {spike.type === "endpoint_failure" && <Server className={cn("h-4 w-4", spike.severity === "critical" ? "text-destructive" : "text-warning")} />}
                {spike.type === "auth_storm" && <ShieldAlert className={cn("h-4 w-4", spike.severity === "critical" ? "text-destructive" : "text-warning")} />}
                {spike.type === "page_degradation" && <Globe className={cn("h-4 w-4", spike.severity === "critical" ? "text-destructive" : "text-warning")} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", spike.severity === "critical" ? "text-destructive" : "text-warning")}>
                  {spike.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{spike.detail}</p>
              </div>
              <Badge variant="outline" className={cn(
                "text-xs shrink-0",
                spike.severity === "critical" ? "text-destructive border-destructive/30" : "text-warning border-warning/30"
              )}>
                {spike.severity}
              </Badge>
            </div>
          ))}
        </motion.div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={AlertTriangle} label="Total Errors" value={kpis.totalErrors} subtext={`${kpis.totalHits} total hits`} variant="warning" delay={0} onClick={() => onSwitchToErrors?.()} />
        <KpiCard icon={XCircle} label="Critical Open" value={kpis.criticalCount} subtext="Unresolved" variant={kpis.criticalCount > 0 ? "critical" : "default"} delay={0.05} onClick={() => onSwitchToErrors?.("critical")} />
        <KpiCard icon={Flame} label="Last 15 min" value={kpis.errorsLast15m} subtext={kpis.errorsLast15m >= 5 ? "⚠ Elevated" : "Normal"} variant={kpis.errorsLast15m >= 5 ? "critical" : "default"} delay={0.1} onClick={() => onSwitchToErrors?.("recent")} />
        <KpiCard icon={Server} label="Failing Endpoints" value={kpis.failingEndpoints} subtext={`of ${kpis.uniqueEndpoints} tracked`} variant={kpis.failingEndpoints > 0 ? "warning" : "default"} delay={0.15} onClick={() => onSwitchToErrors?.("5xx")} />
        <KpiCard icon={Globe} label="Affected Pages" value={kpis.uniquePages} subtext="With errors" variant="default" delay={0.2} onClick={() => onSwitchToErrors?.()} />
        <KpiCard icon={Activity} label="API Errors" value={kpis.apiErrors} subtext="Total API hits" variant={kpis.apiErrors > 20 ? "warning" : "default"} delay={0.25} onClick={() => onSwitchToErrors?.("api")} />
        <KpiCard icon={Database} label="Error Rate" value={kpis.errorRate} subtext="% critical+error" variant={kpis.errorRate > 30 ? "critical" : kpis.errorRate > 10 ? "warning" : "default"} delay={0.3} suffix="%" onClick={() => onSwitchToErrors?.()} />
        <KpiCard icon={ShieldAlert} label="Users Affected" value={kpis.affectedUsers} subtext="Unique users" variant={kpis.affectedUsers >= 5 ? "warning" : "default"} delay={0.35} onClick={() => onSwitchToErrors?.()} />
      </div>

      {/* Error Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Error Rate Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timelineData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="critGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="errors" name="All Errors" stroke="hsl(var(--warning))" fill="url(#errorGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="critical" name="Critical" stroke="hsl(var(--destructive))" fill="url(#critGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="api" name="API Errors" stroke="hsl(var(--primary))" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Endpoint Health Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4" />
              API Endpoint Health
              <Badge variant="secondary" className="text-xs">{endpointMetrics.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {endpointMetrics.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-success/40 mb-2" />
                <p className="text-sm text-muted-foreground">No API errors recorded</p>
              </div>
            ) : (
              <ScrollArea className="h-[340px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Endpoint</TableHead>
                      <TableHead className="text-xs w-[70px]">Hits</TableHead>
                      <TableHead className="text-xs w-[70px]">Status</TableHead>
                      <TableHead className="text-xs w-[80px]">Last Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {endpointMetrics.map((ep, i) => {
                      const is5xx = ep.avgStatusCode >= 500;
                      return (
                        <TableRow key={i} className="cursor-pointer hover:bg-muted/50" onClick={() => onFilterByEndpoint?.(ep.endpoint)}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono shrink-0">
                                {ep.method || "GET"}
                              </Badge>
                              <span className="text-xs font-mono truncate max-w-[180px]">{ep.endpoint}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={is5xx ? "destructive" : "secondary"} className="text-xs">
                              {ep.totalHits}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "text-xs font-mono",
                              ep.avgStatusCode >= 500 ? "text-destructive" : ep.avgStatusCode >= 400 ? "text-warning" : "text-muted-foreground"
                            )}>
                              {ep.avgStatusCode || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(ep.lastSeen), "HH:mm")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Status Code Distribution + Most Problematic Pages */}
        <div className="space-y-6">
          {/* Status Code Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Response Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusCodeDist.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No API status codes recorded</p>
              ) : (
                <div className="space-y-3">
                  {statusCodeDist.map(({ code, count }) => {
                    const maxCount = statusCodeDist[0]?.count || 1;
                    const pct = Math.round((count / maxCount) * 100);
                    const is5xx = code.startsWith("5");
                    const is4xx = code.startsWith("4");
                    return (
                      <div key={code} className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-mono w-12 justify-center",
                            is5xx ? "text-destructive border-destructive/30" :
                            is4xx ? "text-warning border-warning/30" :
                            "text-muted-foreground"
                          )}
                        >
                          {code}
                        </Badge>
                        <div className="flex-1">
                          <Progress
                            value={pct}
                            className={cn(
                              "h-2",
                              is5xx ? "[&>div]:bg-destructive" :
                              is4xx ? "[&>div]:bg-warning" :
                              "[&>div]:bg-primary"
                            )}
                          />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground w-12 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Most Problematic Pages */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Most Problematic Pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pageMetrics.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success/40 mb-2" />
                  <p className="text-sm text-muted-foreground">All pages healthy</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pageMetrics.slice(0, 6).map((page, i) => (
                    <div key={page.route} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => onFilterByPage?.(page.route)}>
                      <span className="text-xs font-bold text-muted-foreground/50 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-mono truncate block">{page.route}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {page.uniqueUsers} user{page.uniqueUsers !== 1 ? "s" : ""} affected
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {page.criticalCount > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1.5">
                            {page.criticalCount} crit
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs tabular-nums">{page.hitCount}</Badge>
                        {page.trend === "up" && <ArrowUp className="h-3 w-3 text-destructive" />}
                        {page.trend === "down" && <ArrowDown className="h-3 w-3 text-success" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─── KPI Card Sub-component ───
const KpiCard = ({
  icon: Icon,
  label,
  value,
  subtext,
  variant = "default",
  delay = 0,
  suffix = "",
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  subtext: string;
  variant?: "default" | "warning" | "critical";
  delay?: number;
  suffix?: string;
  onClick?: () => void;
}) => {
  const styles = {
    default: { iconBg: "bg-primary/10", iconColor: "text-primary", valueColor: "" },
    warning: { iconBg: "bg-warning/10", iconColor: "text-warning", valueColor: "text-warning" },
    critical: { iconBg: "bg-destructive/10", iconColor: "text-destructive", valueColor: "text-destructive" },
  };

  const s = styles[variant];
  const isAlert = variant === "critical" && value > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col gap-2 rounded-2xl border bg-card p-4 transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50",
        isAlert && "shadow-[0_0_15px_-5px_hsl(var(--destructive)/0.2)]"
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn("p-1.5 rounded-lg", s.iconBg)}>
          <Icon className={cn("h-4 w-4", s.iconColor)} />
        </div>
        {isAlert && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute h-full w-full rounded-full bg-destructive opacity-60" />
            <span className="relative rounded-full h-2 w-2 bg-destructive" />
          </span>
        )}
      </div>
      <div>
        <div className="flex items-baseline gap-0.5">
          <AnimatedCounter
            value={value}
            className={cn("text-xl font-bold tabular-nums", value > 0 ? s.valueColor : "text-muted-foreground/40")}
          />
          {suffix && <span className={cn("text-sm font-medium", value > 0 ? s.valueColor : "text-muted-foreground/40")}>{suffix}</span>}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
        <p className="text-[10px] text-muted-foreground/70">{subtext}</p>
      </div>
    </motion.div>
  );
};
