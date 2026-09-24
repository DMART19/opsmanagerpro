import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from "lucide-react";
import { subHours } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ErrorLog } from "@/hooks/use-error-logs";

interface WorkspaceHealth {
  workspaceId: string;
  totalErrors: number;
  criticalErrors: number;
  apiFailures: number;
  authFailures: number;
  score: number;
  status: "healthy" | "warning" | "critical";
}

interface WorkspaceHealthPanelProps {
  errors: ErrorLog[];
  isLoading: boolean;
  onFilterWorkspace: (workspaceId: string) => void;
}

export const WorkspaceHealthPanel = ({ errors, isLoading, onFilterWorkspace }: WorkspaceHealthPanelProps) => {
  const workspaces = useMemo(() => {
    if (!errors?.length) return [];

    const last24h = subHours(new Date(), 24);
    const recentErrors = errors.filter((e) => new Date(e.created_at) > last24h);

    const map = new Map<string, WorkspaceHealth>();

    recentErrors.forEach((err) => {
      const wsId = err.workspace_id || err.user_id || "unknown";
      const existing = map.get(wsId) || {
        workspaceId: wsId,
        totalErrors: 0,
        criticalErrors: 0,
        apiFailures: 0,
        authFailures: 0,
        score: 100,
        status: "healthy" as const,
      };

      existing.totalErrors += err.hit_count;
      if (err.severity === "critical") existing.criticalErrors += err.hit_count;
      if (err.api_endpoint) existing.apiFailures += err.hit_count;
      if (
        err.message.toLowerCase().includes("auth") ||
        err.message.toLowerCase().includes("login") ||
        err.message.toLowerCase().includes("session") ||
        err.api_endpoint?.toLowerCase().includes("auth")
      ) {
        existing.authFailures += err.hit_count;
      }

      map.set(wsId, existing);
    });

    return Array.from(map.values())
      .map((ws) => {
        let score = 100;
        score -= ws.totalErrors * 2;
        score -= ws.criticalErrors * 10;
        score -= ws.apiFailures * 3;
        score -= ws.authFailures * 5;
        ws.score = Math.max(0, Math.min(100, score));

        if (ws.score >= 70) ws.status = "healthy";
        else if (ws.score >= 40) ws.status = "warning";
        else ws.status = "critical";

        return ws;
      })
      .sort((a, b) => a.score - b.score);
  }, [errors]);

  if (isLoading) return null;

  const statusConfig = {
    healthy: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", barColor: "bg-success", label: "Healthy" },
    warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", barColor: "bg-warning", label: "Warning" },
    critical: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", barColor: "bg-destructive", label: "Critical" },
  };

  const summary = {
    healthy: workspaces.filter((w) => w.status === "healthy").length,
    warning: workspaces.filter((w) => w.status === "warning").length,
    critical: workspaces.filter((w) => w.status === "critical").length,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Workspace Health
          <span className="text-xs text-muted-foreground font-normal">(24h)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {workspaces.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 text-success/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All workspaces healthy</p>
          </div>
        ) : (
          <>
            {/* Summary pills */}
            <div className="flex gap-2 mb-3">
              {(["critical", "warning", "healthy"] as const).map((s) => {
                const cfg = statusConfig[s];
                const Icon = cfg.icon;
                return (
                  <div key={s} className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium", cfg.bg, cfg.color)}>
                    <Icon className="h-3 w-3" />
                    {summary[s]} {cfg.label}
                  </div>
                );
              })}
            </div>

            <ScrollArea className="h-[260px]">
              <div className="space-y-1.5">
                {workspaces.map((ws, idx) => {
                  const cfg = statusConfig[ws.status];
                  const Icon = cfg.icon;
                  return (
                    <motion.button
                      key={ws.workspaceId}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted/40 transition-all hover:shadow-sm text-left group"
                      onClick={() => onFilterWorkspace(ws.workspaceId)}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs truncate">{ws.workspaceId.slice(0, 12)}…</p>
                        <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span>{ws.totalErrors} errors</span>
                          {ws.apiFailures > 0 && <span>{ws.apiFailures} API</span>}
                          {ws.authFailures > 0 && <span>{ws.authFailures} auth</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${ws.score}%` }}
                            transition={{ duration: 0.6, delay: 0.2 + idx * 0.04, ease: "easeOut" }}
                            className={cn("h-full rounded-full", cfg.barColor)}
                          />
                        </div>
                        <span className={cn("text-xs font-bold tabular-nums", cfg.color)}>{ws.score}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
};
