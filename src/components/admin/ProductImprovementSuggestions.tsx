/**
 * Product Improvement Suggestions – auto-generated recommendations.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, AlertTriangle, Gauge, MousePointerClick, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ErrorLog } from "@/hooks/use-error-logs";

interface Suggestion {
  title: string;
  description: string;
  source: "errors" | "friction" | "performance" | "adoption";
  impact: "high" | "medium" | "low";
  icon: React.ElementType;
}

const SOURCE_ICONS: Record<string, React.ElementType> = {
  errors: AlertTriangle,
  friction: MousePointerClick,
  performance: Gauge,
  adoption: TrendingDown,
};

export const ProductImprovementSuggestions = ({ errors }: { errors: ErrorLog[] }) => {
  const { data: frictionData } = useQuery({
    queryKey: ["friction-for-suggestions"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("friction_events").select("event_type, page_route, element_label").limit(1000);
      return data as { event_type: string; page_route: string | null; element_label: string | null }[] || [];
    },
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  });

  const { data: perfData } = useQuery({
    queryKey: ["perf-for-suggestions"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("page_performance").select("page_route, load_time_ms").limit(2000);
      return data as { page_route: string; load_time_ms: number }[] || [];
    },
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  });

  const { data: workflowData } = useQuery({
    queryKey: ["workflow-for-suggestions"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("workflow_events").select("workflow_name, step").limit(2000);
      return data as { workflow_name: string; step: string }[] || [];
    },
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  });

  const suggestions = useMemo(() => {
    const result: Suggestion[] = [];

    // Error-based suggestions
    const unresolvedErrors = errors.filter(e => e.status === "unresolved");
    const criticalCount = unresolvedErrors.filter(e => e.severity === "critical").length;
    if (criticalCount >= 3) {
      result.push({
        title: `Resolve ${criticalCount} critical errors`,
        description: "Multiple critical errors are unresolved. These likely affect core user workflows and should be prioritized.",
        source: "errors",
        impact: "high",
        icon: AlertTriangle,
      });
    }

    // Route with most errors
    const routeErrors = new Map<string, number>();
    unresolvedErrors.forEach(e => {
      if (e.page_route) routeErrors.set(e.page_route, (routeErrors.get(e.page_route) || 0) + e.hit_count);
    });
    const worstRoute = [...routeErrors.entries()].sort((a, b) => b[1] - a[1])[0];
    if (worstRoute && worstRoute[1] >= 5) {
      result.push({
        title: `Improve stability of ${worstRoute[0]}`,
        description: `This page has ${worstRoute[1]} error hits. Investigate root causes and add error boundaries.`,
        source: "errors",
        impact: "high",
        icon: AlertTriangle,
      });
    }

    // Friction-based suggestions
    const friction = frictionData || [];
    const validationErrors = friction.filter(f => f.event_type === "validation_error").length;
    if (validationErrors >= 10) {
      result.push({
        title: "Reduce validation friction",
        description: `${validationErrors} validation errors recorded. Consider inline validation, better defaults, or clearer field labels.`,
        source: "friction",
        impact: "medium",
        icon: MousePointerClick,
      });
    }

    const rageClicks = friction.filter(f => f.event_type === "rage_click").length;
    if (rageClicks >= 5) {
      result.push({
        title: "Address rage click hotspots",
        description: `${rageClicks} rage clicks detected. Users may be clicking non-interactive elements or experiencing unresponsive UI.`,
        source: "friction",
        impact: "medium",
        icon: MousePointerClick,
      });
    }

    // Performance-based suggestions
    const perf = perfData || [];
    const routeTimes = new Map<string, number[]>();
    perf.forEach(p => {
      const arr = routeTimes.get(p.page_route) || [];
      arr.push(p.load_time_ms);
      routeTimes.set(p.page_route, arr);
    });
    const slowRoutes = [...routeTimes.entries()]
      .map(([r, times]) => ({ route: r, avg: times.reduce((s, t) => s + t, 0) / times.length }))
      .filter(r => r.avg > 3000);
    if (slowRoutes.length > 0) {
      result.push({
        title: `Optimize ${slowRoutes.length} slow page${slowRoutes.length > 1 ? "s" : ""}`,
        description: `Pages exceeding 3s load time: ${slowRoutes.map(r => r.route).join(", ")}. Consider lazy loading, query optimization, or code splitting.`,
        source: "performance",
        impact: "high",
        icon: Gauge,
      });
    }

    // Workflow drop-off suggestions
    const wf = workflowData || [];
    const wfMap = new Map<string, { started: number; completed: number }>();
    wf.forEach(w => {
      const stats = wfMap.get(w.workflow_name) || { started: 0, completed: 0 };
      if (w.step === "started") stats.started++;
      if (w.step === "completed") stats.completed++;
      wfMap.set(w.workflow_name, stats);
    });
    [...wfMap.entries()].forEach(([name, stats]) => {
      if (stats.started >= 5 && stats.completed / stats.started < 0.5) {
        result.push({
          title: `Improve "${name.replace(/_/g, " ")}" completion`,
          description: `Only ${Math.round((stats.completed / stats.started) * 100)}% completion rate (${stats.completed}/${stats.started}). Simplify the flow or add better guidance.`,
          source: "adoption",
          impact: "medium",
          icon: TrendingDown,
        });
      }
    });

    // Sort by impact
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return result.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);
  }, [errors, frictionData, perfData, workflowData]);

  const impactColors = {
    high: "text-red-600 bg-red-500/10 border-red-500/30",
    medium: "text-yellow-600 bg-yellow-500/10 border-yellow-500/30",
    low: "text-blue-600 bg-blue-500/10 border-blue-500/30",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4" /> Product Improvement Suggestions
          {suggestions.length > 0 && <Badge variant="secondary" className="text-xs">{suggestions.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No improvement suggestions right now. The system generates recommendations based on error patterns, friction, and performance data.</p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s, i) => {
              const Icon = SOURCE_ICONS[s.source] || Lightbulb;
              return (
                <div key={i} className="rounded-lg border p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium flex-1">{s.title}</span>
                    <Badge variant="outline" className={cn("text-[10px]", impactColors[s.impact])}>
                      {s.impact}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">{s.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
