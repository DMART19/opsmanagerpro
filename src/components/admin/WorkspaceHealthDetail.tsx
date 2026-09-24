/**
 * WorkspaceHealthDetail — Drawer showing detailed diagnostics for a workspace.
 */
import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Users,
  Bug,
  Wrench,
  Globe,
  ShieldAlert,
  Layers,
  Lock,
  Database,
} from "lucide-react";
import { format, formatDistanceToNow, subHours } from "date-fns";
import { cn } from "@/lib/utils";
import { diagnoseError, getCategoryLabel, getCategoryColor } from "@/lib/error-diagnostics";
import type { ErrorLog } from "@/hooks/use-error-logs";

interface WorkspaceHealthDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | null;
  errors: ErrorLog[];
  onSelectError: (error: ErrorLog) => void;
}

export const WorkspaceHealthDetail = ({
  open,
  onOpenChange,
  workspaceId,
  errors,
  onSelectError,
}: WorkspaceHealthDetailProps) => {
  const analysis = useMemo(() => {
    if (!workspaceId || !errors?.length) return null;

    const wsErrors = errors.filter(
      (e) => (e.workspace_id || e.user_id) === workspaceId
    );
    if (!wsErrors.length) return null;

    const totalHits = wsErrors.reduce((s, e) => s + e.hit_count, 0);
    const uniqueUsers = new Set(wsErrors.filter((e) => e.user_id).map((e) => e.user_id)).size;
    const unresolved = wsErrors.filter((e) => e.status === "unresolved");
    const critical = wsErrors.filter((e) => e.severity === "critical");

    // Categorize errors
    const apiErrors = wsErrors.filter((e) => e.api_endpoint);
    const authErrors = wsErrors.filter(
      (e) =>
        e.message.toLowerCase().includes("auth") ||
        e.message.toLowerCase().includes("login") ||
        e.message.toLowerCase().includes("session") ||
        e.api_endpoint?.toLowerCase().includes("auth")
    );
    const validationErrors = wsErrors.filter(
      (e) =>
        e.message.toLowerCase().includes("valid") ||
        e.message.toLowerCase().includes("constraint") ||
        e.message.toLowerCase().includes("required")
    );
    const frontendErrors = wsErrors.filter(
      (e) => !e.api_endpoint && !authErrors.includes(e)
    );

    // Health score
    let score = 100;
    score -= totalHits * 2;
    score -= critical.length * 10;
    score -= apiErrors.length * 3;
    score -= authErrors.length * 5;
    score = Math.max(0, Math.min(100, score));

    const level: "critical" | "warning" | "healthy" =
      score < 40 ? "critical" : score < 70 ? "warning" : "healthy";

    // Categories breakdown
    const categories = [
      { label: "API Failures", count: apiErrors.reduce((s, e) => s + e.hit_count, 0), icon: Globe, color: "text-orange-500" },
      { label: "Frontend Errors", count: frontendErrors.reduce((s, e) => s + e.hit_count, 0), icon: Layers, color: "text-blue-500" },
      { label: "Auth Errors", count: authErrors.reduce((s, e) => s + e.hit_count, 0), icon: Lock, color: "text-red-500" },
      { label: "Validation Issues", count: validationErrors.reduce((s, e) => s + e.hit_count, 0), icon: Database, color: "text-yellow-500" },
    ].filter((c) => c.count > 0);

    // Group errors
    const groups = new Map<
      string,
      {
        message: string;
        hits: number;
        severity: string;
        users: Set<string>;
        diagnosis: ReturnType<typeof diagnoseError>;
        lastSeen: string;
        errors: ErrorLog[];
      }
    >();
    wsErrors.forEach((e) => {
      const key = e.error_hash || e.message.slice(0, 80);
      const g = groups.get(key) || {
        message: e.message,
        hits: 0,
        severity: e.severity,
        users: new Set<string>(),
        diagnosis: diagnoseError(e.message, e.stack_trace || undefined),
        lastSeen: e.last_seen_at,
        errors: [],
      };
      g.hits += e.hit_count;
      if (e.user_id) g.users.add(e.user_id);
      if (e.last_seen_at > g.lastSeen) g.lastSeen = e.last_seen_at;
      g.errors.push(e);
      groups.set(key, g);
    });

    const sortedGroups = Array.from(groups.values()).sort((a, b) => b.hits - a.hits);

    // Recent events (last 24h)
    const last24h = subHours(new Date(), 24);
    const recentEvents = wsErrors
      .filter((e) => new Date(e.last_seen_at) > last24h)
      .sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime())
      .slice(0, 10);

    return {
      totalHits,
      uniqueUsers,
      unresolved: unresolved.length,
      critical: critical.length,
      score,
      level,
      categories,
      groups: sortedGroups,
      recentEvents,
      totalErrors: wsErrors.length,
    };
  }, [workspaceId, errors]);

  const levelConfig = {
    critical: { color: "text-red-600", bg: "bg-red-500/10 border-red-500/30", pulse: "bg-red-500", label: "Critical" },
    warning: { color: "text-yellow-600", bg: "bg-yellow-500/10 border-yellow-500/30", pulse: "bg-yellow-500", label: "Warning" },
    healthy: { color: "text-green-600", bg: "bg-green-500/10 border-green-500/30", pulse: "bg-green-500", label: "Healthy" },
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Workspace Health Details
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {!workspaceId || !analysis ? (
            <p className="text-sm text-muted-foreground text-center py-12">No data</p>
          ) : (
            <div className="space-y-5 pb-6">
              {/* Workspace header */}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-14 w-14 rounded-full flex items-center justify-center border-2 font-bold text-lg shrink-0",
                    analysis.score >= 70
                      ? "border-green-500/50 text-green-600"
                      : analysis.score >= 40
                      ? "border-yellow-500/50 text-yellow-600"
                      : "border-red-500/50 text-red-600"
                  )}
                >
                  {analysis.score}
                </div>
                <div>
                  <code className="text-sm font-mono">{workspaceId.slice(0, 16)}…</code>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="relative flex h-2 w-2">
                      <span
                        className={cn(
                          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                          levelConfig[analysis.level].pulse
                        )}
                      />
                      <span
                        className={cn(
                          "relative inline-flex rounded-full h-2 w-2",
                          levelConfig[analysis.level].pulse
                        )}
                      />
                    </span>
                    <span className={cn("text-xs font-medium", levelConfig[analysis.level].color)}>
                      {levelConfig[analysis.level].label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: "Total Hits", value: analysis.totalHits },
                  { label: "Users", value: analysis.uniqueUsers },
                  { label: "Critical", value: analysis.critical },
                  { label: "Unresolved", value: analysis.unresolved },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl border border-border/50 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
                    <p className="text-xl font-bold mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Categories breakdown */}
              {analysis.categories.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Error Categories
                  </h4>
                  <div className="space-y-2.5">
                    {analysis.categories.map((cat) => {
                      const Icon = cat.icon;
                      const pct = analysis.totalHits > 0 ? Math.round((cat.count / analysis.totalHits) * 100) : 0;
                      return (
                        <div key={cat.label} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Icon className={cn("h-3.5 w-3.5", cat.color)} />
                              <span className="text-xs">{cat.label}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">{cat.count}</Badge>
                              <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
                            </div>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Separator />

              {/* Recent events */}
              {analysis.recentEvents.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Recent Events (24h)
                  </h4>
                  <div className="space-y-1">
                    {analysis.recentEvents.map((evt) => (
                      <button
                        key={evt.id}
                        className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-muted/60 transition-colors"
                        onClick={() => onSelectError(evt)}
                      >
                        {evt.severity === "critical" ? (
                          <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                        ) : evt.severity === "error" ? (
                          <AlertCircle className="h-3 w-3 text-orange-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />
                        )}
                        <span className="text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(evt.last_seen_at), { addSuffix: true })}
                        </span>
                        <span className="truncate flex-1">{evt.message}</span>
                        <Badge variant="secondary" className="text-[9px]">{evt.hit_count}x</Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Error groups */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Error Groups ({analysis.groups.length})
                </h4>
                <div className="space-y-2.5">
                  {analysis.groups.slice(0, 10).map((g, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl border p-3 space-y-2",
                        g.severity === "critical" ? "border-red-500/20 bg-red-500/[0.02]" : "border-border/50"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {g.severity === "critical" ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-tight">{g.message}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn("text-[9px]", getCategoryColor(g.diagnosis.category as any))}
                            >
                              {getCategoryLabel(g.diagnosis.category as any)}
                            </Badge>
                            <Badge variant="secondary" className="text-[9px]">{g.hits} hits</Badge>
                            <Badge variant="outline" className="text-[9px]">
                              <Users className="h-2.5 w-2.5 mr-0.5" />{g.users.size}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Diagnostics */}
                      <div className="pl-5 space-y-0.5 text-[10px]">
                        <p className="text-muted-foreground">
                          <Bug className="h-2.5 w-2.5 inline mr-1" />
                          <span className="font-medium text-foreground/80">Cause:</span> {g.diagnosis.likelyCause}
                        </p>
                        <p className="text-muted-foreground">
                          <Wrench className="h-2.5 w-2.5 inline mr-1" />
                          {g.diagnosis.suggestedFix}
                        </p>
                      </div>

                      {/* Click to view individual errors */}
                      {g.errors.length > 0 && (
                        <div className="pl-5">
                          <button
                            className="text-[10px] text-primary hover:underline"
                            onClick={() => onSelectError(g.errors[0])}
                          >
                            View full error details →
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
