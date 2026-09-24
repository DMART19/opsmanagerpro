/**
 * Top Priorities Panel – ranks issues by computed impact score.
 * Includes diagnostic hints for each issue.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, AlertTriangle, AlertCircle, Bug, Wrench, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { diagnoseError } from "@/lib/error-diagnostics";
import type { ErrorLog } from "@/hooks/use-error-logs";

const PAGE_IMPORTANCE: Record<string, number> = {
  "/dashboard": 10,
  "/inventory": 9,
  "/people": 8,
  "/pallet-builder": 7,
  "/calendar": 6,
  "/settings": 5,
  "/help": 3,
};

interface PriorityItem {
  message: string;
  route: string;
  hits: number;
  uniqueUsers: number;
  uniqueWorkspaces: number;
  severity: string;
  score: number;
  diagnosis: { likelyCause: string; suggestedFix: string; category: string };
}

export const TopPrioritiesPanel = ({
  errors,
  isLoading,
}: {
  errors: ErrorLog[];
  isLoading: boolean;
}) => {
  const items = useMemo(() => {
    if (!errors?.length) return [];

    const groups = new Map<
      string,
      { errors: ErrorLog[]; users: Set<string>; workspaces: Set<string> }
    >();
    errors
      .filter((e) => e.status !== "resolved" && e.status !== "ignored")
      .forEach((e) => {
        const key = e.error_hash || e.message.slice(0, 80);
        const group = groups.get(key) || {
          errors: [],
          users: new Set<string>(),
          workspaces: new Set<string>(),
        };
        group.errors.push(e);
        if (e.user_id) group.users.add(e.user_id);
        if (e.workspace_id) group.workspaces.add(e.workspace_id);
        groups.set(key, group);
      });

    return Array.from(groups.entries())
      .map(([, g]): PriorityItem => {
        const first = g.errors[0];
        const hits = g.errors.reduce((s, e) => s + e.hit_count, 0);
        const uniqueUsers = g.users.size;
        const uniqueWorkspaces = g.workspaces.size;
        const sevWeight =
          first.severity === "critical"
            ? 5
            : first.severity === "error"
            ? 3.5
            : first.severity === "warn"
            ? 2
            : 1;
        const pageWeight = PAGE_IMPORTANCE[first.page_route || ""] || 3;
        const score = Math.round(
          hits * 0.25 +
            uniqueUsers * 4 +
            uniqueWorkspaces * 3 +
            sevWeight * 6 +
            pageWeight * 1.5
        );
        const diagnosis = diagnoseError(first.message, first.stack_trace || undefined);
        return {
          message: first.message,
          route: first.page_route || "Unknown",
          hits,
          uniqueUsers,
          uniqueWorkspaces,
          severity: first.severity,
          score,
          diagnosis,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [errors]);

  if (isLoading)
    return (
      <Card>
        <CardContent className="py-8">
          <Skeleton className="h-52 w-full" />
        </CardContent>
      </Card>
    );

  const severityIcon = (sev: string) =>
    sev === "critical" ? (
      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
    ) : sev === "error" ? (
      <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
    ) : (
      <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
    );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" /> Top Priorities
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Ranked by impact score (severity × users × workflow importance)
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No active priorities — all clear 🎉
          </p>
        ) : (
          <div className="space-y-2.5">
            {items.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl border p-3.5 space-y-2 transition-colors",
                  i === 0 && "border-red-500/30 bg-red-500/[0.03]",
                  i === 1 && "border-orange-500/20 bg-orange-500/[0.02]",
                  i >= 2 && "border-border/50"
                )}
              >
                {/* Top row */}
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex items-center justify-center h-7 w-7 rounded-lg text-xs font-bold shrink-0",
                      i === 0
                        ? "bg-red-500/10 text-red-600"
                        : i === 1
                        ? "bg-orange-500/10 text-orange-600"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.message}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        {severityIcon(item.severity)}
                        {item.severity}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {item.route}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">
                      {item.hits} hits
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {item.uniqueUsers} user{item.uniqueUsers !== 1 ? "s" : ""}
                    </Badge>
                    <div className="flex items-center gap-1 pl-1 border-l border-border/50">
                      <span className="text-sm font-bold text-foreground">{item.score}</span>
                      <span className="text-[9px] text-muted-foreground">pts</span>
                    </div>
                  </div>
                </div>

                {/* Diagnostic hint */}
                <div className="flex items-start gap-2 pl-10 text-[11px]">
                  <Bug className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground/80">Likely cause:</span>{" "}
                      {item.diagnosis.likelyCause}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Wrench className="h-2.5 w-2.5 shrink-0" />
                      {item.diagnosis.suggestedFix}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
