/**
 * PageHealthDetail — Drawer showing detailed diagnostics for a specific page route.
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
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  Calendar,
  Users,
  Bug,
  Wrench,
  ExternalLink,
  Layers,
  Activity,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { diagnoseError, getCategoryLabel, getCategoryColor } from "@/lib/error-diagnostics";
import type { ErrorLog } from "@/hooks/use-error-logs";

interface PageHealthDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageRoute: string | null;
  errors: ErrorLog[];
  onSelectError: (error: ErrorLog) => void;
}

export const PageHealthDetail = ({
  open,
  onOpenChange,
  pageRoute,
  errors,
  onSelectError,
}: PageHealthDetailProps) => {
  const pageErrors = useMemo(() => {
    if (!pageRoute || !errors?.length) return [];
    return errors.filter((e) => e.page_route === pageRoute);
  }, [pageRoute, errors]);

  const analysis = useMemo(() => {
    if (!pageErrors.length) return null;

    const totalHits = pageErrors.reduce((s, e) => s + e.hit_count, 0);
    const uniqueUsers = new Set(pageErrors.filter((e) => e.user_id).map((e) => e.user_id)).size;
    const uniqueWorkspaces = new Set(pageErrors.filter((e) => e.workspace_id).map((e) => e.workspace_id)).size;
    const unresolved = pageErrors.filter((e) => e.status === "unresolved");
    const critical = pageErrors.filter((e) => e.severity === "critical");

    const firstSeen = pageErrors.reduce(
      (min, e) => (e.created_at < min ? e.created_at : min),
      pageErrors[0].created_at
    );
    const lastSeen = pageErrors.reduce(
      (max, e) => (e.last_seen_at > max ? e.last_seen_at : max),
      pageErrors[0].last_seen_at
    );

    // Group errors by hash/message
    const groups = new Map<
      string,
      {
        message: string;
        hits: number;
        users: Set<string>;
        severity: string;
        diagnosis: ReturnType<typeof diagnoseError>;
        firstSeen: string;
        lastSeen: string;
        errors: ErrorLog[];
      }
    >();
    pageErrors.forEach((e) => {
      const key = e.error_hash || e.message.slice(0, 80);
      const g = groups.get(key) || {
        message: e.message,
        hits: 0,
        users: new Set<string>(),
        severity: e.severity,
        diagnosis: diagnoseError(e.message, e.stack_trace || undefined),
        firstSeen: e.created_at,
        lastSeen: e.last_seen_at,
        errors: [],
      };
      g.hits += e.hit_count;
      if (e.user_id) g.users.add(e.user_id);
      if (e.created_at < g.firstSeen) g.firstSeen = e.created_at;
      if (e.last_seen_at > g.lastSeen) g.lastSeen = e.last_seen_at;
      g.errors.push(e);
      groups.set(key, g);
    });

    const sortedGroups = Array.from(groups.values()).sort((a, b) => b.hits - a.hits);

    // Health level
    const level: "critical" | "warning" | "healthy" =
      critical.length > 0 ? "critical" : unresolved.length > 0 ? "warning" : "healthy";

    return {
      totalHits,
      uniqueUsers,
      uniqueWorkspaces,
      unresolved: unresolved.length,
      critical: critical.length,
      firstSeen,
      lastSeen,
      groups: sortedGroups,
      level,
      totalErrors: pageErrors.length,
    };
  }, [pageErrors]);

  const levelConfig = {
    critical: { color: "text-red-600", bg: "bg-red-500/10 border-red-500/30", label: "Critical" },
    warning: { color: "text-yellow-600", bg: "bg-yellow-500/10 border-yellow-500/30", label: "Warning" },
    healthy: { color: "text-green-600", bg: "bg-green-500/10 border-green-500/30", label: "Healthy" },
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Page Health Details
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {!pageRoute || !analysis ? (
            <p className="text-sm text-muted-foreground text-center py-12">No data</p>
          ) : (
            <div className="space-y-5 pb-6">
              {/* Page header */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-semibold">{pageRoute}</code>
                  {analysis.level && (
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", levelConfig[analysis.level].bg, levelConfig[analysis.level].color)}
                    >
                      {levelConfig[analysis.level].label}
                    </Badge>
                  )}
                </div>
                <a
                  href={pageRoute}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Open page <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: "Total Hits", value: analysis.totalHits },
                  { label: "Error Records", value: analysis.totalErrors },
                  { label: "Users Affected", value: analysis.uniqueUsers },
                  { label: "Unresolved", value: analysis.unresolved },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl border border-border/50 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
                    <p className="text-xl font-bold mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Timing */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> First:{" "}
                  {format(new Date(analysis.firstSeen), "MMM d, h:mm a")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Last:{" "}
                  {formatDistanceToNow(new Date(analysis.lastSeen), { addSuffix: true })}
                </span>
              </div>

              <Separator />

              {/* Error groups */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Errors on this page ({analysis.groups.length})
                </h4>
                <div className="space-y-2.5">
                  {analysis.groups.map((g, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl border p-3.5 space-y-2",
                        g.severity === "critical"
                          ? "border-red-500/20 bg-red-500/[0.02]"
                          : "border-border/50"
                      )}
                    >
                      {/* Error header */}
                      <div className="flex items-start gap-2">
                        {g.severity === "critical" ? (
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{g.message}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px]", getCategoryColor(g.diagnosis.category as any))}
                            >
                              {getCategoryLabel(g.diagnosis.category as any)}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {g.hits} hits
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              <Users className="h-2.5 w-2.5 mr-0.5" /> {g.users.size}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Diagnostics */}
                      <div className="pl-6 space-y-1 text-[11px]">
                        <p className="text-muted-foreground">
                          <Bug className="h-3 w-3 inline mr-1 text-muted-foreground/60" />
                          <span className="font-medium text-foreground/80">Likely cause:</span>{" "}
                          {g.diagnosis.likelyCause}
                        </p>
                        <p className="text-muted-foreground">
                          <Wrench className="h-3 w-3 inline mr-1 text-muted-foreground/60" />
                          {g.diagnosis.suggestedFix}
                        </p>
                      </div>

                      {/* Timeline */}
                      <div className="pl-6 flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>First: {format(new Date(g.firstSeen), "MMM d, h:mm a")}</span>
                        <span>Last: {formatDistanceToNow(new Date(g.lastSeen), { addSuffix: true })}</span>
                      </div>

                      {/* Individual error instances */}
                      {g.errors.length > 1 && (
                        <div className="pl-6 space-y-0.5 max-h-28 overflow-y-auto">
                          {g.errors.slice(0, 5).map((err) => (
                            <button
                              key={err.id}
                              className="w-full text-left flex items-center gap-2 px-2 py-1 rounded text-[10px] hover:bg-muted/60 transition-colors"
                              onClick={() => onSelectError(err)}
                            >
                              <span className="text-muted-foreground whitespace-nowrap">
                                {format(new Date(err.created_at), "MMM d, h:mm a")}
                              </span>
                              <span className="truncate flex-1 font-mono">
                                {err.user_email || err.user_id?.slice(0, 8) || "anon"}
                              </span>
                              <Badge variant="secondary" className="text-[9px]">
                                {err.hit_count}x
                              </Badge>
                            </button>
                          ))}
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
