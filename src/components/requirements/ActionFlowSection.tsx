/**
 * ActionFlowSection — Self-healing execution flow.
 * Enforces step order. Progress = validated DB outcomes.
 * Flow states: Locked | Available | Running | Recovering | Failed | Complete
 */
import type { RequirementConfig } from "@/hooks/use-requirement-admin";
import type { ActionExecutionStatus, ActionExecutionState } from "@/hooks/use-self-healing-engine";
import type { ResolvedChecks } from "@/hooks/use-requirement-engine";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  Check,
  CircleDot,
  Loader2,
  Lock,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Target,
} from "lucide-react";

interface ActionFlowSectionProps {
  configs: RequirementConfig[];
  completionStatus: Record<string, boolean>;
  nextRequirement: { id: string } | null;
  completedCount: number;
  totalRequired: number;
  actionStates: Record<string, ActionExecutionState>;
  getActionStatus: (id: string) => ActionExecutionStatus;
  onExecuteAction: (id: string, checkKey: keyof ResolvedChecks) => void;
  onHealAll: () => void;
  isHealingAll: boolean;
  onRefresh: () => void;
}

export function ActionFlowSection({
  configs,
  completionStatus,
  nextRequirement,
  completedCount,
  totalRequired,
  actionStates,
  getActionStatus,
  onExecuteAction,
  onHealAll,
  isHealingAll,
  onRefresh,
}: ActionFlowSectionProps) {
  const sortedConfigs = useMemo(() => {
    return [...configs]
      .filter(c => c.enabled)
      .sort((a, b) => a.priority - b.priority);
  }, [configs]);

  if (configs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">No actions to execute.</p>
      </div>
    );
  }

  const pct = totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 0;
  const allComplete = completedCount === totalRequired && totalRequired > 0;
  const failedCount = sortedConfigs.filter(c => getActionStatus(c.requirement_id) === "failed").length;

  return (
    <div className="space-y-4">
      {/* Progress card */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-medium">
              {allComplete
                ? "All actions validated ✓"
                : failedCount > 0
                ? `${failedCount} action${failedCount > 1 ? "s" : ""} failed`
                : isHealingAll
                ? "Self-healing in progress..."
                : "Execution flow"
              }
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedCount} of {totalRequired} validated against database
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    failedCount > 0 ? "bg-destructive" : "bg-primary"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground tabular-nums">{pct}%</span>
            </div>
            <div className="flex items-center gap-1">
              {!allComplete && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={onHealAll}
                  disabled={isHealingAll}
                >
                  {isHealingAll ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  {isHealingAll ? "Healing..." : "Heal All"}
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onRefresh}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Execution flow */}
      <div className="space-y-1">
        {sortedConfigs.map((config, idx) => {
          const status = getActionStatus(config.requirement_id);
          const isComplete = status === "complete";
          const isRunning = status === "running";
          const isRecovering = status === "recovering";
          const isFailed = status === "failed";
          const isActive = nextRequirement?.id === config.requirement_id && status === "not_started";
          const depsUnmet = config.depends_on.some(dep => !(completionStatus[dep] ?? false));
          const isBlocked = !isComplete && !isActive && !isRunning && !isRecovering && !isFailed && depsUnmet;
          const state = actionStates[config.requirement_id];

          return (
            <div key={config.requirement_id}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isRunning && "bg-primary/5 ring-1 ring-primary/20",
                  isRecovering && "bg-warning/5 ring-1 ring-warning/20",
                  isFailed && "bg-destructive/5 ring-1 ring-destructive/20",
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
                  ) : isRunning ? (
                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Loader2 className="h-2.5 w-2.5 text-primary-foreground animate-spin" />
                    </div>
                  ) : isRecovering ? (
                    <div className="h-5 w-5 rounded-full bg-warning flex items-center justify-center">
                      <RotateCcw className="h-2.5 w-2.5 text-warning-foreground animate-spin" />
                    </div>
                  ) : isFailed ? (
                    <div className="h-5 w-5 rounded-full bg-destructive/10 flex items-center justify-center">
                      <ShieldAlert className="h-3 w-3 text-destructive" />
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
                      <CircleDot className="h-2 w-2 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "text-sm font-medium",
                      isComplete && "line-through text-muted-foreground",
                    )}>
                      {config.label}
                    </span>
                    {isRunning && (
                      <Badge className="text-[10px] h-4 bg-primary/10 text-primary border-primary/20" variant="outline">
                        Running
                      </Badge>
                    )}
                    {isRecovering && (
                      <Badge className="text-[10px] h-4 bg-warning/10 text-warning border-warning/20" variant="outline">
                        Recovering ({state?.retryCount}/3)
                      </Badge>
                    )}
                    {isFailed && (
                      <Badge className="text-[10px] h-4 bg-destructive/10 text-destructive border-destructive/20" variant="outline">
                        Failed
                      </Badge>
                    )}
                    {isActive && (
                      <Badge className="text-[10px] h-4 bg-primary/10 text-primary border-primary/20" variant="outline">
                        Next
                      </Badge>
                    )}
                    {isBlocked && (
                      <Badge variant="outline" className="text-[10px] h-4 text-muted-foreground">
                        Blocked
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {isFailed
                      ? state?.lastError ?? config.explanation
                      : config.explanation
                    }
                  </p>
                </div>

                {/* Status badge */}
                <div className="shrink-0">
                  {isComplete ? (
                    <Badge variant="secondary" className="text-[10px] h-5 gap-0.5 bg-primary/10 text-primary border-primary/20">
                      <Target className="h-2.5 w-2.5" /> Validated
                    </Badge>
                  ) : isFailed ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-6 gap-1 text-destructive border-destructive/20"
                      onClick={() => onExecuteAction(config.requirement_id, config.check_key as keyof ResolvedChecks)}
                    >
                      <RotateCcw className="h-2.5 w-2.5" /> Retry
                    </Button>
                  ) : isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-6 gap-1 text-primary border-primary/20"
                      onClick={() => onExecuteAction(config.requirement_id, config.check_key as keyof ResolvedChecks)}
                    >
                      <Play className="h-2.5 w-2.5" /> Run
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">•</span>
                  )}
                </div>
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
