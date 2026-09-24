/**
 * Security Configuration Dashboard
 *
 * Centralized view of platform security posture: auth, encryption,
 * audit, permissions, monitoring and recovery readiness.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Lock,
  FileText,
  Users,
  Eye,
  Radio,
  KeyRound,
  Server,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ── Types ─────────────────────────────────────────────── */

interface SecurityCheck {
  category: string;
  name: string;
  status: "active" | "healthy" | "warning" | "disabled" | "critical";
  detail: string;
}

interface SecurityWarning {
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  message: string;
  recommendation: string;
}

interface SecuritySummary {
  total_checks: number;
  active: number;
  healthy: number;
  warning: number;
  critical: number;
  failed_logins_24h: number;
  security_events_24h: number;
  rls_coverage_pct: number;
}

interface PostureResult {
  assessed_at: string;
  checks: SecurityCheck[];
  warnings: SecurityWarning[];
  summary: SecuritySummary;
}

/* ── Helpers ───────────────────────────────────────────── */

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType }> = {
  authentication: { label: "Authentication", icon: KeyRound },
  encryption: { label: "Encryption", icon: Lock },
  audit: { label: "Audit Logs", icon: FileText },
  permissions: { label: "Permissions", icon: Users },
  monitoring: { label: "Monitoring", icon: Radio },
  recovery: { label: "Recovery", icon: Server },
};

const STATUS_STYLE: Record<string, { dot: string; badge: string; label: string }> = {
  active:   { dot: "bg-emerald-500", badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700", label: "Active" },
  healthy:  { dot: "bg-emerald-500", badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700", label: "Healthy" },
  warning:  { dot: "bg-yellow-500",  badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700",   label: "Warning" },
  disabled: { dot: "bg-red-500",     badge: "border-red-500/30 bg-red-500/10 text-red-700",           label: "Disabled" },
  critical: { dot: "bg-red-600",     badge: "border-red-600/30 bg-red-600/10 text-red-700",           label: "Critical" },
};

const SEVERITY_STYLE: Record<string, string> = {
  critical: "border-red-500/40 bg-red-500/5",
  high:     "border-orange-500/40 bg-orange-500/5",
  medium:   "border-yellow-500/40 bg-yellow-500/5",
  low:      "border-blue-500/40 bg-blue-500/5",
};

/* ── Component ─────────────────────────────────────────── */

export const SecurityConfigPanel = () => {
  const [posture, setPosture] = useState<PostureResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchPosture = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("assess_security_posture");
      if (error) throw error;
      setPosture(data as unknown as PostureResult);
    } catch (err: any) {
      console.error("Security posture fetch failed:", err);
      toast.error("Failed to load security posture");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosture(); }, [fetchPosture]);

  const runAssessment = async () => {
    setRunning(true);
    await fetchPosture();
    setRunning(false);
    toast.success("Security assessment completed");
  };

  /* Group checks by category */
  const grouped = useMemo(() => {
    if (!posture) return {};
    return posture.checks.reduce<Record<string, SecurityCheck[]>>((acc, c) => {
      (acc[c.category] ??= []).push(c);
      return acc;
    }, {});
  }, [posture]);

  const overallScore = useMemo(() => {
    if (!posture) return 0;
    const s = posture.summary;
    const good = s.active + s.healthy;
    return Math.round((good / Math.max(s.total_checks, 1)) * 100);
  }, [posture]);

  const overallStatus = overallScore >= 85 ? "healthy" : overallScore >= 60 ? "warning" : "critical";

  /* ── Render ── */

  if (loading && !posture) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const summary = posture?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Security Configuration
          </h2>
          <p className="text-sm text-muted-foreground">
            Platform security posture overview
            {posture?.assessed_at && (
              <span className="ml-2 text-xs">
                · assessed {formatDistanceToNow(new Date(posture.assessed_at), { addSuffix: true })}
              </span>
            )}
          </p>
        </div>
        <Button size="sm" onClick={runAssessment} disabled={running}>
          {running
            ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
            : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
          Re-assess
        </Button>
      </div>

      {/* Overall Score Banner */}
      <Card className={cn(
        "border",
        overallStatus === "healthy" && "border-emerald-500/30 bg-emerald-500/5",
        overallStatus === "warning" && "border-yellow-500/30 bg-yellow-500/5",
        overallStatus === "critical" && "border-red-500/30 bg-red-500/5",
      )}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {overallStatus === "healthy" && <ShieldCheck className="h-10 w-10 text-emerald-600" />}
              {overallStatus === "warning" && <AlertTriangle className="h-10 w-10 text-yellow-600" />}
              {overallStatus === "critical" && <ShieldAlert className="h-10 w-10 text-red-600" />}
              <div>
                <p className="text-2xl font-bold">{overallScore}%</p>
                <p className="text-sm text-muted-foreground">
                  {overallStatus === "healthy" && "Security posture is strong"}
                  {overallStatus === "warning" && "Some configurations need attention"}
                  {overallStatus === "critical" && "Critical security issues detected"}
                </p>
              </div>
            </div>
            <div className="hidden sm:grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-xl font-bold text-emerald-600">{(summary?.active ?? 0) + (summary?.healthy ?? 0)}</p>
                <p className="text-xs text-muted-foreground">Passing</p>
              </div>
              <div>
                <p className="text-xl font-bold text-yellow-600">{summary?.warning ?? 0}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
              <div>
                <p className="text-xl font-bold text-red-600">{summary?.critical ?? 0}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <KeyRound className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{summary?.failed_logins_24h ?? 0}</p>
            <p className="text-xs text-muted-foreground">Failed Logins (24h)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{summary?.security_events_24h ?? 0}</p>
            <p className="text-xs text-muted-foreground">Security Events (24h)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Lock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{summary?.rls_coverage_pct ?? 0}%</p>
            <p className="text-xs text-muted-foreground">RLS Coverage</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ShieldCheck className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{summary?.total_checks ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Checks</p>
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {posture && posture.warnings.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Security Warnings ({posture.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {posture.warnings.map((w, i) => (
              <div key={i} className={cn("p-3 rounded-lg border", SEVERITY_STYLE[w.severity] ?? SEVERITY_STYLE.medium)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                        {w.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{CATEGORY_META[w.category]?.label ?? w.category}</span>
                    </div>
                    <p className="text-sm font-medium">{w.message}</p>
                    <p className="text-xs text-muted-foreground">{w.recommendation}</p>
                  </div>
                  <XCircle className="h-4 w-4 shrink-0 text-destructive/60 mt-0.5" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Checks by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(grouped).map(([cat, checks]) => {
          const meta = CATEGORY_META[cat] ?? { label: cat, icon: ShieldCheck };
          const CatIcon = meta.icon;
          return (
            <Card key={cat}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CatIcon className="h-4 w-4 text-muted-foreground" />
                  {meta.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {checks.map((c, i) => {
                  const style = STATUS_STYLE[c.status] ?? STATUS_STYLE.warning;
                  return (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-md border bg-card/50">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn("h-2 w-2 rounded-full shrink-0", style.dot)} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.detail}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] shrink-0 ml-2", style.badge)}>
                        {style.label}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
