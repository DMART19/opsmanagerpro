/**
 * DataIntegrityPanel — Cross-validates Ops Center metrics and flags mismatches.
 * Displayed in the Errors tab to surface data consistency issues.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { isAfter, subHours } from "date-fns";
import { cn } from "@/lib/utils";
import type { ErrorLog } from "@/hooks/use-error-logs";
import type { AdminAlert } from "@/hooks/use-admin-alerts";

interface IntegrityCheck {
  label: string;
  description: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

interface DataIntegrityPanelProps {
  errors: ErrorLog[];
  alerts: AdminAlert[];
  isLoading: boolean;
}

export const DataIntegrityPanel = ({ errors, alerts, isLoading }: DataIntegrityPanelProps) => {
  const checks = useMemo((): IntegrityCheck[] => {
    if (!errors?.length) {
      return [{
        label: "No data to validate",
        description: "No error records found — integrity checks will run when data is available.",
        status: "pass",
        detail: "0 records",
      }];
    }

    const results: IntegrityCheck[] = [];
    const now = new Date();
    const last24h = subHours(now, 24);

    // Check 1: Error record totals vs grouped hit_count totals
    const totalRecords = errors.length;
    const totalHits = errors.reduce((s, e) => s + e.hit_count, 0);
    const hitRecordRatio = totalRecords > 0 ? (totalHits / totalRecords).toFixed(1) : "0";
    results.push({
      label: "Error deduplication integrity",
      description: `${totalRecords} records represent ${totalHits} total hits (${hitRecordRatio}x dedup ratio).`,
      status: totalHits >= totalRecords ? "pass" : "warn",
      detail: `${totalRecords} records / ${totalHits} hits`,
    });

    // Check 2: Unresolved count consistency
    const unresolvedRecords = errors.filter(e => e.status === "unresolved").length;
    const resolvedRecords = errors.filter(e => e.status === "resolved").length;
    const otherStatusRecords = totalRecords - unresolvedRecords - resolvedRecords;
    results.push({
      label: "Status distribution",
      description: `${unresolvedRecords} unresolved, ${resolvedRecords} resolved, ${otherStatusRecords} other statuses.`,
      status: "pass",
      detail: `${unresolvedRecords} open`,
    });

    // Check 3: 24h error count vs last_seen_at filter
    const errors24hByCreated = errors.filter(e => isAfter(new Date(e.created_at), last24h)).length;
    const errors24hByLastSeen = errors.filter(e => isAfter(new Date(e.last_seen_at), last24h)).length;
    const drift = Math.abs(errors24hByLastSeen - errors24hByCreated);
    results.push({
      label: "Time window consistency",
      description: `24h errors: ${errors24hByLastSeen} (by last_seen_at) vs ${errors24hByCreated} (by created_at). Drift: ${drift}.`,
      status: drift > errors24hByLastSeen * 0.5 && drift > 5 ? "warn" : "pass",
      detail: `${drift} drift`,
    });

    // Check 4: All error_hash values should be non-null for proper grouping
    const nullHashCount = errors.filter(e => !e.error_hash).length;
    results.push({
      label: "Error hash coverage",
      description: `${totalRecords - nullHashCount}/${totalRecords} errors have a hash for proper grouping.`,
      status: nullHashCount > totalRecords * 0.1 ? "warn" : "pass",
      detail: nullHashCount > 0 ? `${nullHashCount} missing` : "100% coverage",
    });

    // Check 5: Active alerts vs error data correlation
    const activeAlerts = (alerts || []).filter(a => a.status === "active");
    const activeErrorSpikes = activeAlerts.filter(a => a.trigger_type === "error_spike");
    // For each active error spike alert, verify the referenced error_hash exists in error_logs
    const orphanAlerts = activeErrorSpikes.filter(a => {
      if (!a.top_error_hash) return false;
      return !errors.some(e => e.error_hash === a.top_error_hash && e.status === "unresolved");
    });
    results.push({
      label: "Alert-error correlation",
      description: orphanAlerts.length > 0
        ? `${orphanAlerts.length} active alert(s) reference errors that are no longer unresolved.`
        : `${activeAlerts.length} active alert(s), all correlated with current error data.`,
      status: orphanAlerts.length > 0 ? "warn" : "pass",
      detail: orphanAlerts.length > 0 ? `${orphanAlerts.length} orphaned` : "Synced",
    });

    // Check 6: Severity distribution sanity
    const severityCounts = { critical: 0, error: 0, warn: 0, info: 0 };
    errors.forEach(e => {
      if (e.severity in severityCounts) severityCounts[e.severity as keyof typeof severityCounts]++;
    });
    const unknownSeverity = totalRecords - Object.values(severityCounts).reduce((s, c) => s + c, 0);
    results.push({
      label: "Severity classification",
      description: `Critical: ${severityCounts.critical}, Error: ${severityCounts.error}, Warn: ${severityCounts.warn}, Info: ${severityCounts.info}${unknownSeverity > 0 ? `, Unknown: ${unknownSeverity}` : ""}.`,
      status: unknownSeverity > 0 ? "warn" : "pass",
      detail: unknownSeverity > 0 ? `${unknownSeverity} unclassified` : "All classified",
    });

    return results;
  }, [errors, alerts]);

  if (isLoading) return null;

  const failCount = checks.filter(c => c.status === "fail").length;
  const warnCount = checks.filter(c => c.status === "warn").length;
  const allPassing = failCount === 0 && warnCount === 0;

  return (
    <Card className={cn(
      "border",
      failCount > 0 ? "border-destructive/20" :
      warnCount > 0 ? "border-warning/20" :
      "border-success/20"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className={cn("h-4 w-4",
            failCount > 0 ? "text-destructive" :
            warnCount > 0 ? "text-warning" :
            "text-success"
          )} />
          Data Integrity
          {allPassing ? (
            <Badge variant="outline" className="text-[10px] text-success border-success/30 ml-auto">
              All checks passing
            </Badge>
          ) : (
            <Badge variant="outline" className={cn("text-[10px] ml-auto",
              failCount > 0 ? "text-destructive border-destructive/30" : "text-warning border-warning/30"
            )}>
              {failCount + warnCount} issue{failCount + warnCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {checks.map((check, i) => (
          <div key={i} className="flex items-start gap-2 py-1.5">
            {check.status === "pass" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className={cn("h-3.5 w-3.5 shrink-0 mt-0.5",
                check.status === "fail" ? "text-destructive" : "text-warning"
              )} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium">{check.label}</p>
                <span className={cn("text-[10px] font-mono shrink-0",
                  check.status === "pass" ? "text-muted-foreground" :
                  check.status === "warn" ? "text-warning" : "text-destructive"
                )}>
                  {check.detail}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">{check.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
