/**
 * Data Lifecycle Monitoring Panel
 *
 * Displays retention health, stored record totals, pending deletions,
 * overdue purges, and failed cleanup indicators for admin observability.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  Database,
  HardDrive,
  RefreshCw,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PolicySnapshot {
  data_type: string;
  display_name: string;
  retention_days: number;
  auto_purge_enabled: boolean;
  purge_strategy: string;
  last_purge_at: string | null;
  last_purge_count: number;
  row_count: number;
  oldest_record: string | null;
  contains_pii: boolean;
}

interface LifecycleData {
  policies: PolicySnapshot[];
  totalStoredRecords: number;
  overdueCount: number;
  missingCleanupCount: number;
  pendingDeletionRequests: number;
  recentlyDeletedCount: number;
  lastEnforcementRun: string | null;
  healthIssues: HealthIssue[];
}

interface HealthIssue {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
}

export const DataLifecycleMonitor = () => {
  const [data, setData] = useState<LifecycleData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      // Parallel fetch: governance assessment, deletion requests, recently deleted counts
      const [govRes, delReqRes, ...softDeleteRes] = await Promise.all([
        supabase.rpc("assess_data_governance"),
        supabase
          .from("deletion_requests" as any)
          .select("id, status", { count: "exact", head: false })
          .eq("status", "pending"),
        // Count recently soft-deleted items across core tables
        ...(["cache_inventory", "employees", "tasks", "pallets", "certifications"] as const).map(t =>
          supabase
            .from(t)
            .select("id", { count: "exact", head: true })
            .not("deleted_at", "is", null)
        ),
      ]);

      if (govRes.error) throw govRes.error;

      const gov = govRes.data as any;
      const policies: PolicySnapshot[] = gov?.policies ?? [];

      // Calculate metrics
      const totalStoredRecords = policies.reduce((s: number, p: PolicySnapshot) => s + (p.row_count || 0), 0);

      const overdueItems: PolicySnapshot[] = [];
      const missingCleanup: PolicySnapshot[] = [];
      const healthIssues: HealthIssue[] = [];

      for (const p of policies) {
        const isOverdue =
          p.auto_purge_enabled &&
          p.retention_days > 0 &&
          p.oldest_record &&
          new Date(p.oldest_record) < new Date(Date.now() - p.retention_days * 86400000);

        if (isOverdue) {
          overdueItems.push(p);
          healthIssues.push({
            severity: p.contains_pii ? "critical" : "warning",
            title: `${p.display_name} exceeds retention limit`,
            detail: `Records older than ${p.retention_days}-day policy exist. ${p.contains_pii ? "Contains PII — immediate action required." : "Schedule a purge."}`,
          });
        }

        // Missing cleanup: auto-purge enabled but never ran
        if (p.auto_purge_enabled && p.retention_days > 0 && !p.last_purge_at && p.row_count > 0) {
          missingCleanup.push(p);
          healthIssues.push({
            severity: "warning",
            title: `${p.display_name} has never been purged`,
            detail: `Auto-purge is enabled but no cleanup has ever run for this data type (${p.row_count.toLocaleString()} records).`,
          });
        }

        // Stale purge: last purge was more than 2x retention period ago
        if (
          p.auto_purge_enabled &&
          p.retention_days > 0 &&
          p.last_purge_at &&
          new Date(p.last_purge_at) < new Date(Date.now() - p.retention_days * 2 * 86400000)
        ) {
          healthIssues.push({
            severity: "info",
            title: `${p.display_name} purge may be stale`,
            detail: `Last purge was ${formatDistanceToNow(new Date(p.last_purge_at), { addSuffix: true })}. Consider verifying the scheduled cleanup is running.`,
          });
        }
      }

      // Recently deleted count from soft-delete tables
      const recentlyDeletedCount = softDeleteRes.reduce((s, r) => s + (r.count ?? 0), 0);

      // Find latest purge across all policies
      const purgeTimestamps = policies
        .filter((p: PolicySnapshot) => p.last_purge_at)
        .map((p: PolicySnapshot) => new Date(p.last_purge_at!).getTime());
      const lastEnforcementRun = purgeTimestamps.length > 0
        ? new Date(Math.max(...purgeTimestamps)).toISOString()
        : null;

      // Check if enforcement hasn't run in 48 hours
      if (!lastEnforcementRun || new Date(lastEnforcementRun) < new Date(Date.now() - 48 * 3600000)) {
        healthIssues.push({
          severity: "critical",
          title: "Retention enforcement may not be running",
          detail: lastEnforcementRun
            ? `Last enforcement was ${formatDistanceToNow(new Date(lastEnforcementRun), { addSuffix: true })}. The daily cron job may have failed.`
            : "No retention enforcement has ever run. Verify the scheduled cleanup job is configured.",
        });
      }

      setData({
        policies,
        totalStoredRecords,
        overdueCount: overdueItems.length,
        missingCleanupCount: missingCleanup.length,
        pendingDeletionRequests: delReqRes.data?.length ?? 0,
        recentlyDeletedCount,
        lastEnforcementRun,
        healthIssues: healthIssues.sort((a, b) => {
          const order = { critical: 0, warning: 1, info: 2 };
          return order[a.severity] - order[b.severity];
        }),
      });
    } catch (err) {
      console.error("Lifecycle monitor failed:", err);
      toast.error("Failed to load lifecycle data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const overallHealth = useMemo(() => {
    if (!data) return "healthy";
    if (data.healthIssues.some(i => i.severity === "critical")) return "critical";
    if (data.healthIssues.some(i => i.severity === "warning")) return "warning";
    return "healthy";
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const SEVERITY_STYLE = {
    critical: "border-destructive/40 bg-destructive/5",
    warning: "border-yellow-500/40 bg-yellow-500/5",
    info: "border-blue-500/40 bg-blue-500/5",
  };

  const SEVERITY_ICON = {
    critical: <XCircle className="h-4 w-4 text-destructive shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />,
    info: <Clock className="h-4 w-4 text-blue-500 shrink-0" />,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Data Lifecycle Monitor
          </h3>
          <p className="text-xs text-muted-foreground">
            Real-time view of data retention enforcement and storage health
            {data?.lastEnforcementRun && (
              <span className="ml-1">
                · last enforcement {formatDistanceToNow(new Date(data.lastEnforcementRun), { addSuffix: true })}
              </span>
            )}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetch} disabled={loading}>
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Health Banner */}
      <Card className={cn(
        "border",
        overallHealth === "healthy" && "border-emerald-500/30 bg-emerald-500/5",
        overallHealth === "warning" && "border-yellow-500/30 bg-yellow-500/5",
        overallHealth === "critical" && "border-destructive/30 bg-destructive/5",
      )}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {overallHealth === "healthy" && <CheckCircle2 className="h-8 w-8 text-emerald-600" />}
            {overallHealth === "warning" && <AlertTriangle className="h-8 w-8 text-yellow-600" />}
            {overallHealth === "critical" && <ShieldAlert className="h-8 w-8 text-destructive" />}
            <div>
              <p className="text-sm font-semibold">
                {overallHealth === "healthy" && "All retention policies are being enforced"}
                {overallHealth === "warning" && "Some data lifecycle issues need attention"}
                {overallHealth === "critical" && "Critical data lifecycle issues detected"}
              </p>
              <p className="text-xs text-muted-foreground">
                {data?.healthIssues.length === 0
                  ? "No issues found — all data is within retention limits."
                  : `${data?.healthIssues.length} issue${(data?.healthIssues.length ?? 0) > 1 ? "s" : ""} detected across governance policies.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <HardDrive className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xl font-bold">{(data?.totalStoredRecords ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Total Stored Records</p>
          </CardContent>
        </Card>
        <Card className={data?.overdueCount ? "border-destructive/30" : ""}>
          <CardContent className="p-3 text-center">
            <AlertTriangle className={cn("h-4 w-4 mx-auto mb-1", data?.overdueCount ? "text-destructive" : "text-muted-foreground")} />
            <p className={cn("text-xl font-bold", data?.overdueCount ? "text-destructive" : "")}>
              {data?.overdueCount ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground">Overdue Purges</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Trash2 className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xl font-bold">{data?.recentlyDeletedCount ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Soft-Deleted Items</p>
          </CardContent>
        </Card>
        <Card className={data?.pendingDeletionRequests ? "border-yellow-500/30" : ""}>
          <CardContent className="p-3 text-center">
            <Archive className={cn("h-4 w-4 mx-auto mb-1", data?.pendingDeletionRequests ? "text-yellow-600" : "text-muted-foreground")} />
            <p className={cn("text-xl font-bold", data?.pendingDeletionRequests ? "text-yellow-600" : "")}>
              {data?.pendingDeletionRequests ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground">Pending Deletions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Database className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xl font-bold">{data?.missingCleanupCount ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Missing Cleanups</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Issues */}
      {data && data.healthIssues.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Retention Health Issues ({data.healthIssues.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Issues that may indicate retention policies are not being enforced correctly.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2 p-4 pt-0">
                {data.healthIssues.map((issue, i) => (
                  <div key={i} className={cn("p-3 rounded-lg border", SEVERITY_STYLE[issue.severity])}>
                    <div className="flex items-start gap-2">
                      {SEVERITY_ICON[issue.severity]}
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium">{issue.title}</p>
                          <Badge variant="outline" className="text-[8px] uppercase tracking-wider">
                            {issue.severity}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{issue.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Per-policy storage breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            Storage Breakdown by Data Type
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[280px]">
            <div className="space-y-1 p-4 pt-0">
              {(data?.policies ?? [])
                .filter(p => p.row_count > 0)
                .sort((a, b) => b.row_count - a.row_count)
                .map(p => {
                  const maxRows = Math.max(...(data?.policies ?? []).map(pp => pp.row_count), 1);
                  const pct = Math.round((p.row_count / maxRows) * 100);
                  const isOverdue =
                    p.auto_purge_enabled &&
                    p.retention_days > 0 &&
                    p.oldest_record &&
                    new Date(p.oldest_record) < new Date(Date.now() - p.retention_days * 86400000);

                  return (
                    <div key={p.data_type} className={cn("p-2.5 rounded-md border", isOverdue ? "border-destructive/30 bg-destructive/5" : "bg-card/50")}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium truncate">{p.display_name}</span>
                          {isOverdue && <Badge variant="outline" className="text-[8px] border-destructive/30 text-destructive">OVERDUE</Badge>}
                          {p.contains_pii && <Badge variant="outline" className="text-[8px] border-red-500/30 bg-red-500/10 text-red-700">PII</Badge>}
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">{p.row_count.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", isOverdue ? "bg-destructive/60" : "bg-primary/40")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {p.retention_days > 0 ? `${p.retention_days}d retention` : "No expiry"}
                          {p.auto_purge_enabled ? " · auto-purge" : ""}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {p.last_purge_at
                            ? `Purged ${formatDistanceToNow(new Date(p.last_purge_at), { addSuffix: true })}`
                            : "Never purged"}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
