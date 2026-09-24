/**
 * ActionsSection — Self-healing action cards.
 * Each action: trigger → execute → validate → detect → recover → complete
 * Status states: Not Started | Running | Recovering | Failed | Complete
 */
import { useState } from "react";
import { type ResolvedChecks } from "@/hooks/use-requirement-engine";
import type { RequirementConfig } from "@/hooks/use-requirement-admin";
import { type ActionExecutionStatus, type ActionExecutionState, type RecoveryLog } from "@/hooks/use-self-healing-engine";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Database,
  GitBranch,
  Loader2,
  Lock,
  MousePointerClick,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Target,
  Zap,
} from "lucide-react";

// ─── Action Definitions ────────────────────────────────────────────

interface ActionDefinition {
  id: string;
  trigger: string;
  executeFn: string;
  dataSource: string;
  validates: string[];
  group: string;
}

const ACTION_DEFS: Record<string, ActionDefinition> = {
  has_container: {
    id: "has_container",
    trigger: "add_container_button",
    executeFn: "createContainer()",
    dataSource: "cache_inventory (containers)",
    validates: ["Container exists in DB", "Container appears in UI"],
    group: "assets",
  },
  has_item: {
    id: "has_item",
    trigger: "add_item_button",
    executeFn: "createItem()",
    dataSource: "cache_inventory (items)",
    validates: ["Item exists in DB", "Item appears in UI"],
    group: "assets",
  },
  has_assignment: {
    id: "has_assignment",
    trigger: "assign_item_action",
    executeFn: "assignItemToContainer()",
    dataSource: "cache_inventory.container_id",
    validates: ["item.container_id is not null"],
    group: "assets",
  },
  has_task: {
    id: "has_task",
    trigger: "add_task_button",
    executeFn: "createTask()",
    dataSource: "tasks",
    validates: ["Task exists in DB", "Appears in calendar"],
    group: "calendar",
  },
  has_team_member: {
    id: "has_team_member",
    trigger: "add_team_member_button",
    executeFn: "createTeamMember()",
    dataSource: "employees",
    validates: ["Employee exists in DB", "Appears in team table"],
    group: "team",
  },
  has_credential_assignment: {
    id: "has_credential_assignment",
    trigger: "assign_credential_action",
    executeFn: "assignCredential()",
    dataSource: "employee_requirements",
    validates: ["credential.employee_id exists"],
    group: "team",
  },
};

const GROUP_LABELS: Record<string, string> = {
  assets: "Assets",
  calendar: "Calendar",
  team: "Team",
  pallet: "Pallet",
  trailer: "Trailer",
};

const GROUP_ORDER = ["assets", "calendar", "team", "pallet", "trailer"];

// ─── Props ─────────────────────────────────────────────────────────

interface ActionsSectionProps {
  configs: RequirementConfig[];
  locked: boolean;
  onRefresh: () => void;
  // Self-healing props
  actionStates: Record<string, ActionExecutionState>;
  getActionStatus: (id: string) => ActionExecutionStatus;
  onExecuteAction: (id: string, checkKey: keyof ResolvedChecks) => void;
  onResetAction: (id: string) => void;
  completionStatus: Record<string, boolean>;
  nextRequirement: { id: string } | null;
  checks: ResolvedChecks;
  completedCount: number;
  totalRequired: number;
}

export function ActionsSection({
  configs,
  locked,
  onRefresh,
  actionStates,
  getActionStatus,
  onExecuteAction,
  onResetAction,
  completionStatus,
  nextRequirement,
  checks,
  completedCount,
  totalRequired,
}: ActionsSectionProps) {
  const sortedConfigs = [...configs]
    .filter(c => c.enabled)
    .sort((a, b) => a.priority - b.priority);

  const grouped: Record<string, RequirementConfig[]> = {};
  for (const c of sortedConfigs) {
    if (!grouped[c.group]) grouped[c.group] = [];
    grouped[c.group].push(c);
  }

  const failedCount = sortedConfigs.filter(c => getActionStatus(c.requirement_id) === "failed").length;
  const recoveringCount = sortedConfigs.filter(c => getActionStatus(c.requirement_id) === "recovering").length;

  if (configs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">No actions defined.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {completedCount}/{totalRequired} validated
          </span>
          {recoveringCount > 0 && (
            <Badge variant="warning" className="text-[10px] h-4 gap-0.5">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> {recoveringCount} recovering
            </Badge>
          )}
          {failedCount > 0 && (
            <Badge variant="destructive" className="text-[10px] h-4 gap-0.5">
              <ShieldAlert className="h-2.5 w-2.5" /> {failedCount} failed
            </Badge>
          )}
          {completedCount === totalRequired && totalRequired > 0 && (
            <Badge variant="default" className="text-[10px] h-4 gap-0.5">
              <Check className="h-2.5 w-2.5" /> All Complete
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={onRefresh}>
          <RefreshCw className="h-3 w-3" /> Re-validate
        </Button>
      </div>

      {/* Grouped action cards */}
      {GROUP_ORDER.filter(g => grouped[g]).map(group => (
        <div key={group}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {GROUP_LABELS[group] || group}
            </span>
            <Badge variant="secondary" className="text-[10px] h-4">
              {grouped[group].filter(c => completionStatus[c.requirement_id]).length}/{grouped[group].length}
            </Badge>
          </div>
          <div className="space-y-1.5">
            {grouped[group].map(config => (
              <ActionCard
                key={config.requirement_id}
                config={config}
                actionDef={ACTION_DEFS[config.requirement_id]}
                executionStatus={getActionStatus(config.requirement_id)}
                executionState={actionStates[config.requirement_id]}
                isActive={nextRequirement?.id === config.requirement_id}
                isBlocked={!completionStatus[config.requirement_id] && nextRequirement?.id !== config.requirement_id && config.depends_on.some(dep => !(completionStatus[dep] ?? false))}
                locked={locked}
                allConfigs={configs}
                completionStatus={completionStatus}
                onExecute={() => onExecuteAction(config.requirement_id, config.check_key as keyof ResolvedChecks)}
                onReset={() => onResetAction(config.requirement_id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Action Card ───────────────────────────────────────────────────

interface ActionCardProps {
  config: RequirementConfig;
  actionDef?: ActionDefinition;
  executionStatus: ActionExecutionStatus;
  executionState?: ActionExecutionState;
  isActive: boolean;
  isBlocked: boolean;
  locked: boolean;
  allConfigs: RequirementConfig[];
  completionStatus: Record<string, boolean>;
  onExecute: () => void;
  onReset: () => void;
}

function ActionCard({
  config,
  actionDef,
  executionStatus,
  executionState,
  isActive,
  isBlocked,
  locked,
  allConfigs,
  completionStatus,
  onExecute,
  onReset,
}: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const depConfigs = allConfigs.filter(c => config.depends_on.includes(c.requirement_id));
  const logs = executionState?.recoveryLogs ?? [];

  return (
    <Card
      className={cn(
        "transition-all duration-200 border-l-2 overflow-hidden",
        executionStatus === "complete" && "border-l-primary/60",
        executionStatus === "running" && "border-l-primary ring-1 ring-primary/15",
        executionStatus === "recovering" && "border-l-warning ring-1 ring-warning/15",
        executionStatus === "failed" && "border-l-destructive ring-1 ring-destructive/15",
        isBlocked && "border-l-muted opacity-50",
        executionStatus === "not_started" && !isActive && !isBlocked && "border-l-border",
      )}
    >
      <button
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
        disabled={locked}
      >
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </div>

        {/* Status icon */}
        <div className="shrink-0">
          {executionStatus === "complete" ? (
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-3 w-3 text-primary" />
            </div>
          ) : executionStatus === "running" ? (
            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <Loader2 className="h-2.5 w-2.5 text-primary-foreground animate-spin" />
            </div>
          ) : executionStatus === "recovering" ? (
            <div className="h-5 w-5 rounded-full bg-warning flex items-center justify-center">
              <RotateCcw className="h-2.5 w-2.5 text-warning-foreground animate-spin" />
            </div>
          ) : executionStatus === "failed" ? (
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
            <div className="h-5 w-5 rounded-full border-2 border-border" />
          )}
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-sm font-medium",
              executionStatus === "complete" && "line-through text-muted-foreground"
            )}>
              {config.label}
            </span>
            {config.is_core && (
              <Badge variant="secondary" className="text-[10px] h-4">Core</Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{config.explanation}</p>
        </div>

        <div className="shrink-0">
          <ExecutionStatusBadge status={executionStatus} isBlocked={isBlocked} retryCount={executionState?.retryCount} />
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border/50 space-y-3">
          {/* Failed error banner */}
          {executionStatus === "failed" && executionState?.lastError && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-destructive/10 text-destructive">
              <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium">Execution Failed</p>
                <p className="text-[11px] opacity-80">{executionState.lastError}</p>
              </div>
              <Button variant="outline" size="sm" className="text-[10px] h-6 gap-1 shrink-0" onClick={onReset}>
                <RotateCcw className="h-2.5 w-2.5" /> Reset
              </Button>
            </div>
          )}

          {/* Recovering banner */}
          {executionStatus === "recovering" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-warning/10 text-warning">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              <p className="text-xs font-medium">
                Recovery attempt {executionState?.retryCount ?? 0}/3 — syncing state...
              </p>
            </div>
          )}

          {/* Blocked warning */}
          {isBlocked && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-warning/10 text-warning">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium">Blocked</p>
                <p className="text-[11px] opacity-80">
                  Complete {depConfigs.filter(d => !completionStatus[d.requirement_id]).map(d => d.label).join(", ")} first
                </p>
              </div>
            </div>
          )}

          {/* Action details grid */}
          <div className="grid gap-2 text-xs">
            <div className="flex items-center gap-2">
              <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-16 shrink-0">Trigger</span>
              <code className="font-mono text-[11px] bg-muted/50 px-1.5 py-0.5 rounded">
                {actionDef?.trigger || config.resolve}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-16 shrink-0">Execute</span>
              <code className="font-mono text-[11px] bg-muted/50 px-1.5 py-0.5 rounded">
                {actionDef?.executeFn || "—"}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-16 shrink-0">Data</span>
              <code className="font-mono text-[11px] bg-muted/50 px-1.5 py-0.5 rounded">
                {actionDef?.dataSource || "—"}
              </code>
            </div>
          </div>

          {/* Validation checks */}
          {actionDef && (
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" /> Validation
              </span>
              <div className="space-y-0.5">
                {actionDef.validates.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    {executionStatus === "complete" ? (
                      <Check className="h-3 w-3 text-primary shrink-0" />
                    ) : executionStatus === "failed" ? (
                      <ShieldAlert className="h-3 w-3 text-destructive shrink-0" />
                    ) : (
                      <CircleDot className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <span className={cn(
                      executionStatus === "complete" ? "text-muted-foreground line-through" : "text-foreground"
                    )}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {depConfigs.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <GitBranch className="h-3 w-3" /> Dependencies
              </span>
              <div className="flex flex-wrap gap-1">
                {depConfigs.map(dep => (
                  <Badge
                    key={dep.requirement_id}
                    variant={completionStatus[dep.requirement_id] ? "default" : "outline"}
                    className={cn(
                      "text-[10px] h-5 gap-0.5",
                      completionStatus[dep.requirement_id]
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "text-warning border-warning/20"
                    )}
                  >
                    {completionStatus[dep.requirement_id] ? (
                      <Check className="h-2.5 w-2.5" />
                    ) : (
                      <CircleDot className="h-2.5 w-2.5" />
                    )}
                    {dep.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recovery logs */}
          {logs.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Recovery Log
              </span>
              <div className="max-h-32 overflow-y-auto space-y-0.5 rounded-md bg-muted/30 p-2">
                {logs.slice(-8).map((log, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] font-mono">
                    <span className={cn(
                      "shrink-0 w-1 h-1 rounded-full mt-1.5",
                      log.result === "success" ? "bg-primary" : "bg-destructive"
                    )} />
                    <span className="text-muted-foreground shrink-0">#{log.attempt}</span>
                    <span className="text-muted-foreground shrink-0">{log.step}</span>
                    <span className="text-foreground/70">{log.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!locked && executionStatus !== "running" && executionStatus !== "recovering" && (
            <div className="flex items-center gap-2 pt-1">
              {executionStatus === "failed" && (
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={onReset}>
                  <RotateCcw className="h-3 w-3" /> Reset & Retry
                </Button>
              )}
              {(executionStatus === "not_started" || executionStatus === "failed") && !isBlocked && (
                <Button variant="default" size="sm" className="text-xs h-7 gap-1" onClick={onExecute}>
                  <Play className="h-3 w-3" /> Validate Now
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Execution Status Badge ────────────────────────────────────────

function ExecutionStatusBadge({ status, isBlocked, retryCount }: { status: ActionExecutionStatus; isBlocked: boolean; retryCount?: number }) {
  if (isBlocked && status === "not_started") {
    return (
      <Badge variant="outline" className="text-[10px] h-5 gap-0.5 text-muted-foreground">
        <Lock className="h-2.5 w-2.5" /> Blocked
      </Badge>
    );
  }

  switch (status) {
    case "complete":
      return (
        <Badge variant="secondary" className="text-[10px] h-5 gap-0.5 bg-primary/10 text-primary border-primary/20">
          <Check className="h-2.5 w-2.5" /> Complete
        </Badge>
      );
    case "running":
      return (
        <Badge variant="default" className="text-[10px] h-5 gap-0.5">
          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Running
        </Badge>
      );
    case "recovering":
      return (
        <Badge variant="warning" className="text-[10px] h-5 gap-0.5">
          <RotateCcw className="h-2.5 w-2.5 animate-spin" /> Recovering {retryCount ? `(${retryCount}/3)` : ""}
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="text-[10px] h-5 gap-0.5">
          <ShieldAlert className="h-2.5 w-2.5" /> Failed
        </Badge>
      );
    case "not_started":
      return (
        <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">
          Not Started
        </Badge>
      );
  }
}
