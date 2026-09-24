/**
 * RunSection — Live flow preview.
 * ✔ Completed → Active • Upcoming
 * Real-time updating from requirement engine.
 */
import { useMemo } from "react";
import type { RequirementConfig } from "@/hooks/use-requirement-admin";
import { useRequirementEngine } from "@/hooks/use-requirement-engine";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  Check,
  Circle,
  Loader2,
  Lock,
  Play,
} from "lucide-react";

interface RunSectionProps {
  configs: RequirementConfig[];
}

export function RunSection({ configs }: RunSectionProps) {
  const {
    completionStatus,
    nextRequirement,
    allRequiredComplete,
    completedCount,
    totalRequired,
    loading,
  } = useRequirementEngine();

  const sortedConfigs = useMemo(() => {
    return [...configs]
      .filter(c => c.enabled)
      .sort((a, b) => a.priority - b.priority);
  }, [configs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">No requirements to preview.</p>
      </div>
    );
  }

  const pct = totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {allRequiredComplete ? "All requirements complete" : "Setup in progress"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedCount} of {totalRequired} steps done
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground tabular-nums">
              {pct}%
            </span>
          </div>
        </div>
      </Card>

      {/* Flow */}
      <div className="space-y-1">
        {sortedConfigs.map((config, idx) => {
          const isComplete = completionStatus[config.requirement_id] ?? false;
          const isActive = nextRequirement?.id === config.requirement_id;
          const depsUnmet = config.depends_on.some(dep => !(completionStatus[dep] ?? false));
          const isBlocked = !isComplete && !isActive && depsUnmet;

          return (
            <div key={config.requirement_id}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isActive && "bg-primary/5 ring-1 ring-primary/20",
                  isComplete && "bg-muted/30",
                  isBlocked && "opacity-50",
                )}
              >
                {/* Status icon */}
                <div className="shrink-0">
                  {isComplete ? (
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                  ) : isActive ? (
                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Play className="h-2.5 w-2.5 text-primary-foreground fill-primary-foreground" />
                    </div>
                  ) : isBlocked ? (
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                      <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-border flex items-center justify-center">
                      <Circle className="h-2 w-2 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-medium",
                      isComplete && "line-through text-muted-foreground",
                    )}>
                      {config.label}
                    </span>
                    {isActive && (
                      <Badge className="text-[10px] h-4 bg-primary/10 text-primary border-primary/20" variant="outline">
                        Active
                      </Badge>
                    )}
                    {isBlocked && (
                      <Badge variant="outline" className="text-[10px] h-4 text-muted-foreground">
                        Blocked
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{config.explanation}</p>
                </div>

                {/* Status text */}
                <span className={cn(
                  "text-[10px] font-medium shrink-0",
                  isComplete ? "text-primary" : isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {isComplete ? "✔" : isActive ? "→" : "•"}
                </span>
              </div>

              {idx < sortedConfigs.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <ArrowDown className="h-3 w-3 text-border" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
