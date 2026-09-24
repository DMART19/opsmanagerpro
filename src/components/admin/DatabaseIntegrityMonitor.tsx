/**
 * DatabaseIntegrityMonitor — Self-healing database monitor for the Ops Control Center.
 * Shows integrity scan results, anomalies detected, and repairs applied.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Database,
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface IntegrityLogEntry {
  id: string;
  scan_id: string;
  anomaly_type: string;
  severity: string;
  affected_table: string;
  affected_record_id: string | null;
  description: string;
  correction_applied: string | null;
  snapshot_data: Record<string, unknown> | null;
  created_at: string;
}

const SEVERITY_CONFIG: Record<string, { color: string; icon: typeof AlertTriangle }> = {
  critical: { color: "text-destructive", icon: XCircle },
  high: { color: "text-destructive", icon: AlertTriangle },
  medium: { color: "text-warning", icon: AlertTriangle },
  warning: { color: "text-warning", icon: AlertTriangle },
  low: { color: "text-muted-foreground", icon: CheckCircle2 },
};

export const DatabaseIntegrityMonitor = () => {
  const [isScanning, setIsScanning] = useState(false);

  const { data: logs = [], isLoading, refetch } = useQuery<IntegrityLogEntry[]>({
    queryKey: ["database-integrity-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("database_integrity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as IntegrityLogEntry[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const runManualScan = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("db-integrity-monitor");
      if (error) throw error;
      const result = data as { anomalies_found: number; repairs_applied: number };
      toast.success("Integrity scan complete", {
        description: `${result.anomalies_found} anomalies found, ${result.repairs_applied} repairs applied`,
      });
      await refetch();
    } catch (err: any) {
      toast.error("Scan failed", { description: err.message });
    } finally {
      setIsScanning(false);
    }
  };

  // Aggregate stats
  const recentScans = new Set(logs.map((l) => l.scan_id)).size;
  const totalAnomalies = logs.length;
  const totalRepairs = logs.filter((l) => l.correction_applied && !l.correction_applied.includes("Flagged")).length;
  const criticalCount = logs.filter((l) => l.severity === "critical" || l.severity === "high").length;

  // Group by scan
  const scanGroups = logs.reduce<Record<string, IntegrityLogEntry[]>>((acc, log) => {
    if (!acc[log.scan_id]) acc[log.scan_id] = [];
    acc[log.scan_id].push(log);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Database className="h-3.5 w-3.5" /> Total Scans
            </div>
            <p className="text-2xl font-bold tabular-nums">{recentScans}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Anomalies
            </div>
            <p className="text-2xl font-bold tabular-nums">{totalAnomalies}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Wrench className="h-3.5 w-3.5" /> Auto-Repaired
            </div>
            <p className="text-2xl font-bold tabular-nums text-success">{totalRepairs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-destructive text-xs mb-1">
              <XCircle className="h-3.5 w-3.5" /> Critical
            </div>
            <p className="text-2xl font-bold tabular-nums text-destructive">{criticalCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Self-Healing Database Monitor</h3>
          {totalAnomalies === 0 && (
            <Badge variant="outline" className="text-success border-success/30 bg-success/10 text-xs">
              All Clear
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={runManualScan} disabled={isScanning} className="gap-1.5">
            {isScanning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {isScanning ? "Scanning..." : "Run Scan"}
          </Button>
        </div>
      </div>

      {/* Scan Results */}
      {totalAnomalies === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
            <ShieldCheck className="h-10 w-10 text-success" />
            <p className="font-medium">No anomalies detected</p>
            <p className="text-sm">Database integrity is healthy. Run a manual scan to verify.</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {Object.entries(scanGroups)
              .sort(([, a], [, b]) => new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime())
              .map(([scanId, entries]) => {
                const scanTime = entries[0]?.created_at;
                const repairsInScan = entries.filter((e) => e.correction_applied && !e.correction_applied.includes("Flagged")).length;

                return (
                  <Card key={scanId}>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {scanTime ? format(new Date(scanTime), "MMM d, yyyy HH:mm:ss") : "Unknown"}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">
                            {entries.length} anomal{entries.length === 1 ? "y" : "ies"}
                          </Badge>
                          {repairsInScan > 0 && (
                            <Badge className="text-xs bg-success/15 text-success border-success/30">
                              {repairsInScan} repaired
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <div className="space-y-2">
                        {entries.map((entry) => {
                          const config = SEVERITY_CONFIG[entry.severity] || SEVERITY_CONFIG.warning;
                          const Icon = config.icon;
                          return (
                            <div
                              key={entry.id}
                              className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/40"
                            >
                              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {entry.affected_table}
                                  </Badge>
                                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.color)}>
                                    {entry.severity}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {entry.anomaly_type}
                                  </span>
                                </div>
                                <p className="text-xs text-foreground/80">{entry.description}</p>
                                {entry.correction_applied && (
                                  <p className="text-[11px] text-success mt-0.5 flex items-center gap-1">
                                    <Wrench className="h-3 w-3" /> {entry.correction_applied}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
