/**
 * Workflow Completion Tracker – shows start vs complete rates.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { GitBranch, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const WORKFLOW_LABELS: Record<string, string> = {
  invite_team: "Invite Team Member",
  move_item: "Move Item",
  asset_creation: "Create Asset",
  container_creation: "Create Container",
  pallet_build: "Build Pallet",
  checkout_item: "Checkout Item",
};

export const WorkflowCompletionTracker = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["workflow-completion-analytics"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("workflow_events")
        .select("workflow_name, step")
        .limit(5000);
      if (error) throw error;
      return data as { workflow_name: string; step: string }[];
    },
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  });

  if (isLoading) return <Card><CardContent className="py-8"><Skeleton className="h-40 w-full" /></CardContent></Card>;

  const events = data || [];

  // Aggregate
  const workflows = new Map<string, { started: number; completed: number; abandoned: number }>();
  events.forEach(e => {
    const w = workflows.get(e.workflow_name) || { started: 0, completed: 0, abandoned: 0 };
    if (e.step === "started") w.started++;
    if (e.step === "completed") w.completed++;
    if (e.step === "abandoned") w.abandoned++;
    workflows.set(e.workflow_name, w);
  });

  const sorted = Array.from(workflows.entries())
    .map(([name, stats]) => ({
      name,
      label: WORKFLOW_LABELS[name] || name,
      ...stats,
      completionRate: stats.started > 0 ? Math.round((stats.completed / stats.started) * 100) : 0,
      dropOff: stats.started > 0 ? Math.round(((stats.started - stats.completed) / stats.started) * 100) : 0,
    }))
    .sort((a, b) => a.completionRate - b.completionRate);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4" /> Workflow Completion
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No workflow data yet. Events are tracked as users complete flows.</p>
        ) : (
          <div className="space-y-4">
            {sorted.map(w => (
              <div key={w.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{w.label}</span>
                    {w.dropOff >= 50 && w.started >= 3 && (
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{w.completed}/{w.started} completed</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        w.completionRate >= 75 ? "text-green-600 border-green-500/30" :
                        w.completionRate >= 40 ? "text-yellow-600 border-yellow-500/30" :
                        "text-red-600 border-red-500/30"
                      )}
                    >
                      {w.completionRate}%
                    </Badge>
                  </div>
                </div>
                <Progress value={w.completionRate} className="h-2" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
