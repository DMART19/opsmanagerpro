/**
 * Root Cause Analysis – groups related errors and identifies root causes
 * with debugging directions for each cluster.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  GitMerge,
  AlertTriangle,
  AlertCircle,
  Bug,
  Wrench,
  Globe,
  Layers,
  Lock,
  Database,
  ChevronDown,
  ChevronRight,
  Users,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { diagnoseError, getCategoryLabel, getCategoryColor } from "@/lib/error-diagnostics";
import type { ErrorLog } from "@/hooks/use-error-logs";

interface RootCauseGroup {
  id: string;
  rootCause: string;
  category: "api" | "auth" | "frontend" | "validation" | "data" | "unknown";
  errors: ErrorLog[];
  totalHits: number;
  uniqueUsers: number;
  affectedRoutes: string[];
  severity: "critical" | "error" | "warn" | "info";
  suggestedDebug: string;
  suggestedFix: string;
}

const CATEGORY_CONFIG = {
  api: { label: "API / Network", icon: Globe, color: "text-orange-500" },
  auth: { label: "Authentication", icon: Lock, color: "text-red-500" },
  frontend: { label: "Frontend / UI", icon: Layers, color: "text-blue-500" },
  validation: { label: "Validation / Data", icon: Database, color: "text-yellow-500" },
  data: { label: "Data Integrity", icon: Database, color: "text-purple-500" },
  unknown: { label: "Other", icon: Bug, color: "text-muted-foreground" },
};

function classifyRootCause(errors: ErrorLog[]): RootCauseGroup["category"] {
  const msgs = errors.map((e) => e.message.toLowerCase()).join(" ");
  if (msgs.includes("auth") || msgs.includes("login") || msgs.includes("session") || msgs.includes("token") || msgs.includes("unauthorized"))
    return "auth";
  if (errors.some((e) => e.api_endpoint) || msgs.includes("api") || msgs.includes("fetch") || msgs.includes("network") || msgs.includes("cors"))
    return "api";
  if (msgs.includes("valid") || msgs.includes("constraint") || msgs.includes("required") || msgs.includes("null"))
    return "validation";
  if (msgs.includes("undefined") || msgs.includes("null") || msgs.includes("cannot read") || msgs.includes("is not a function") || msgs.includes("is not defined"))
    return "frontend";
  if (msgs.includes("duplicate") || msgs.includes("foreign key") || msgs.includes("integrity"))
    return "data";
  return "unknown";
}

function deriveRootCause(errors: ErrorLog[], category: RootCauseGroup["category"]): string {
  const first = errors[0];
  const diagnosis = diagnoseError(first.message, first.stack_trace || undefined);

  if (category === "api" && first.api_endpoint) {
    return `API endpoint "${first.api_endpoint}" is failing (${first.api_status_code || "unknown status"})`;
  }
  if (category === "auth") {
    return "Authentication or session management failure affecting user access";
  }
  if (category === "frontend" && first.stack_trace) {
    const match = first.stack_trace.match(/at\s+(\w+)/);
    return match ? `Component "${match[1]}" throwing runtime error` : diagnosis.likelyCause;
  }
  return diagnosis.likelyCause;
}

function deriveDebugAction(category: RootCauseGroup["category"], errors: ErrorLog[]): string {
  const first = errors[0];
  switch (category) {
    case "api":
      return `Check API endpoint "${first.api_endpoint || "unknown"}" response, verify request payload, and check backend logs for status ${first.api_status_code || "N/A"}`;
    case "auth":
      return "Review auth token lifecycle, check session refresh logic, verify RLS policies are not blocking valid requests";
    case "frontend":
      return "Inspect component stack trace, check for null/undefined data flows, add error boundaries around the failing component";
    case "validation":
      return "Review form validation rules, check database constraints, ensure client-side validation matches server-side rules";
    case "data":
      return "Check foreign key references, review data migration scripts, verify data consistency across related tables";
    default:
      return diagnoseError(first.message, first.stack_trace || undefined).suggestedFix;
  }
}

export const RootCauseAnalysis = ({
  errors,
  isLoading,
}: {
  errors: ErrorLog[];
  isLoading: boolean;
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    if (!errors?.length) return [];

    // Group by error_hash or message prefix
    const hashGroups = new Map<string, ErrorLog[]>();
    errors
      .filter((e) => e.status !== "resolved" && e.status !== "ignored")
      .forEach((e) => {
        const key = e.error_hash || e.message.slice(0, 60);
        const arr = hashGroups.get(key) || [];
        arr.push(e);
        hashGroups.set(key, arr);
      });

    // Now cluster related hashes by category + route pattern
    const clusters = new Map<string, ErrorLog[]>();
    hashGroups.forEach((errs, hash) => {
      const cat = classifyRootCause(errs);
      const routes = [...new Set(errs.map((e) => e.page_route).filter(Boolean))];
      const clusterKey = `${cat}:${routes.sort().join(",")}:${hash.slice(0, 20)}`;
      const existing = clusters.get(clusterKey) || [];
      clusters.set(clusterKey, [...existing, ...errs]);
    });

    return Array.from(clusters.entries())
      .map(([id, errs]): RootCauseGroup => {
        const category = classifyRootCause(errs);
        const users = new Set(errs.filter((e) => e.user_id).map((e) => e.user_id!));
        const routes = [...new Set(errs.map((e) => e.page_route).filter(Boolean))] as string[];
        const totalHits = errs.reduce((s, e) => s + e.hit_count, 0);
        const worstSeverity = errs.some((e) => e.severity === "critical")
          ? "critical"
          : errs.some((e) => e.severity === "error")
          ? "error"
          : errs.some((e) => e.severity === "warn")
          ? "warn"
          : "info";
        const diagnosis = diagnoseError(errs[0].message, errs[0].stack_trace || undefined);

        return {
          id,
          rootCause: deriveRootCause(errs, category),
          category,
          errors: errs,
          totalHits,
          uniqueUsers: users.size,
          affectedRoutes: routes,
          severity: worstSeverity as any,
          suggestedDebug: deriveDebugAction(category, errs),
          suggestedFix: diagnosis.suggestedFix,
        };
      })
      .sort((a, b) => b.totalHits - a.totalHits)
      .slice(0, 15);
  }, [errors]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (isLoading)
    return (
      <Card>
        <CardContent className="py-8">
          <Skeleton className="h-52 w-full" />
        </CardContent>
      </Card>
    );

  // Category summary
  const categorySummary = useMemo(() => {
    const counts: Record<string, { count: number; hits: number }> = {};
    groups.forEach((g) => {
      const c = counts[g.category] || { count: 0, hits: 0 };
      c.count += g.errors.length;
      c.hits += g.totalHits;
      counts[g.category] = c;
    });
    return Object.entries(counts)
      .map(([cat, stats]) => ({ category: cat as keyof typeof CATEGORY_CONFIG, ...stats }))
      .sort((a, b) => b.hits - a.hits);
  }, [groups]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GitMerge className="h-4 w-4" /> Root Cause Analysis
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {groups.length} clusters
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No active error clusters detected 🎉
          </p>
        ) : (
          <div className="space-y-4">
            {/* Category summary bar */}
            <div className="flex flex-wrap gap-2">
              {categorySummary.map((cs) => {
                const cfg = CATEGORY_CONFIG[cs.category];
                const Icon = cfg.icon;
                return (
                  <div
                    key={cs.category}
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium bg-muted/50 border border-border/50"
                  >
                    <Icon className={cn("h-3 w-3", cfg.color)} />
                    <span>{cfg.label}</span>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                      {cs.hits}
                    </Badge>
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Error clusters */}
            <div className="space-y-2">
              {groups.map((g) => {
                const cfg = CATEGORY_CONFIG[g.category];
                const CatIcon = cfg.icon;
                const isOpen = expanded.has(g.id);

                return (
                  <div
                    key={g.id}
                    className={cn(
                      "rounded-xl border transition-colors",
                      g.severity === "critical"
                        ? "border-red-500/20 bg-red-500/[0.02]"
                        : "border-border/50"
                    )}
                  >
                    {/* Header */}
                    <button
                      className="w-full flex items-start gap-3 p-3.5 text-left"
                      onClick={() => toggleExpand(g.id)}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <CatIcon className={cn("h-4 w-4 shrink-0 mt-0.5", cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">
                          {g.rootCause}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn("text-[9px]", getCategoryColor(g.category as any))}
                          >
                            {cfg.label}
                          </Badge>
                          <Badge variant="secondary" className="text-[9px]">
                            {g.totalHits} hits
                          </Badge>
                          <Badge variant="outline" className="text-[9px] gap-0.5">
                            <Users className="h-2.5 w-2.5" />
                            {g.uniqueUsers}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] gap-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {g.affectedRoutes.length} route{g.affectedRoutes.length !== 1 ? "s" : ""}
                          </Badge>
                          {g.severity === "critical" && (
                            <Badge
                              variant="outline"
                              className="text-[9px] text-red-600 border-red-500/30"
                            >
                              critical
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 pt-0 space-y-3">
                        <Separator />

                        {/* Affected routes */}
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                            Affected Routes
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {g.affectedRoutes.map((r) => (
                              <code
                                key={r}
                                className="text-[10px] font-mono bg-muted/50 px-2 py-0.5 rounded"
                              >
                                {r}
                              </code>
                            ))}
                          </div>
                        </div>

                        {/* Diagnostic hints */}
                        <div className="space-y-1.5 text-[11px]">
                          <p className="text-muted-foreground">
                            <Bug className="h-3 w-3 inline mr-1 text-muted-foreground/60" />
                            <span className="font-medium text-foreground/80">
                              Root Cause:
                            </span>{" "}
                            {g.rootCause}
                          </p>
                          <p className="text-muted-foreground">
                            <Wrench className="h-3 w-3 inline mr-1 text-muted-foreground/60" />
                            <span className="font-medium text-foreground/80">
                              Debug:
                            </span>{" "}
                            {g.suggestedDebug}
                          </p>
                          <p className="text-muted-foreground">
                            <Wrench className="h-3 w-3 inline mr-1 text-muted-foreground/60" />
                            <span className="font-medium text-foreground/80">
                              Fix:
                            </span>{" "}
                            {g.suggestedFix}
                          </p>
                        </div>

                        {/* Individual errors */}
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                            Related Errors ({g.errors.length})
                          </p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {g.errors.slice(0, 8).map((err) => (
                              <div
                                key={err.id}
                                className="flex items-center gap-2 text-[10px] px-2 py-1 rounded hover:bg-muted/40"
                              >
                                {err.severity === "critical" ? (
                                  <AlertTriangle className="h-2.5 w-2.5 text-red-500 shrink-0" />
                                ) : (
                                  <AlertCircle className="h-2.5 w-2.5 text-yellow-500 shrink-0" />
                                )}
                                <span className="truncate flex-1 font-mono">
                                  {err.message}
                                </span>
                                <Badge variant="secondary" className="text-[8px]">
                                  {err.hit_count}x
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
