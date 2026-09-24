/**
 * useSelfHealingEngine — Self-healing execution layer for the Experience Engine.
 *
 * Execution loop: trigger → execute → validate → detect → recover → re-validate → complete
 *
 * Guardrails:
 *   - Max 3 retry attempts per action
 *   - 500–1000ms cooldown between retries
 *   - FAILED status after max retries (no infinite loops)
 *   - All failures surfaced in UI
 */

import { useState, useCallback, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRequirementEngine, REQUIREMENT_ENGINE_KEY, type ResolvedChecks } from "@/hooks/use-requirement-engine";

// ─── Types ────────────────────────────────────────────────────────

export type ActionExecutionStatus =
  | "not_started"
  | "running"
  | "recovering"
  | "failed"
  | "complete";

export interface RecoveryLog {
  timestamp: number;
  actionId: string;
  attempt: number;
  step: string;
  result: "success" | "failure";
  detail: string;
}

export interface ActionExecutionState {
  status: ActionExecutionStatus;
  retryCount: number;
  lastRun: number | null;
  lastError: string | null;
  recoveryLogs: RecoveryLog[];
}

const MAX_RETRIES = 3;
const COOLDOWN_MS = 750;

// ─── Default state factory ────────────────────────────────────────

function defaultActionState(): ActionExecutionState {
  return {
    status: "not_started",
    retryCount: 0,
    lastRun: null,
    lastError: null,
    recoveryLogs: [],
  };
}

// ─── Hook ─────────────────────────────────────────────────────────

export function useSelfHealingEngine() {
  const queryClient = useQueryClient();
  const engine = useRequirementEngine();
  const [actionStates, setActionStates] = useState<Record<string, ActionExecutionState>>({});
  const [isHealingAll, setIsHealingAll] = useState(false);
  const abortRef = useRef(false);

  // Derive execution status from DB checks + local recovery state
  const getActionStatus = useCallback(
    (requirementId: string): ActionExecutionStatus => {
      const local = actionStates[requirementId];
      if (local?.status === "running" || local?.status === "recovering" || local?.status === "failed") {
        return local.status;
      }
      if (engine.completionStatus[requirementId]) return "complete";
      return "not_started";
    },
    [actionStates, engine.completionStatus]
  );

  // Add a recovery log entry
  const addLog = useCallback(
    (actionId: string, attempt: number, step: string, result: "success" | "failure", detail: string) => {
      const entry: RecoveryLog = {
        timestamp: Date.now(),
        actionId,
        attempt,
        step,
        result,
        detail,
      };
      setActionStates(prev => {
        const current = prev[actionId] || defaultActionState();
        return {
          ...prev,
          [actionId]: {
            ...current,
            recoveryLogs: [...current.recoveryLogs.slice(-19), entry], // keep last 20
          },
        };
      });
    },
    []
  );

  // Update a single action's state
  const updateActionState = useCallback(
    (actionId: string, patch: Partial<ActionExecutionState>) => {
      setActionStates(prev => ({
        ...prev,
        [actionId]: { ...(prev[actionId] || defaultActionState()), ...patch },
      }));
    },
    []
  );

  // Force re-fetch DB checks and wait for fresh data
  const revalidateChecks = useCallback(async (): Promise<ResolvedChecks> => {
    await queryClient.invalidateQueries({ queryKey: REQUIREMENT_ENGINE_KEY });
    // Wait for refetch to settle
    await new Promise(r => setTimeout(r, 300));
    const cached = queryClient.getQueryData<ResolvedChecks>(REQUIREMENT_ENGINE_KEY);
    return cached ?? {
      containers_exist: false,
      items_exist: false,
      items_assigned: false,
      tasks_exist: false,
      team_members_exist: false,
      credentials_assigned: false,
    };
  }, [queryClient]);

  // ─── Execute single action with recovery ────────────────────────

  const executeAction = useCallback(
    async (requirementId: string, checkKey: keyof ResolvedChecks) => {
      // Already complete? Skip.
      if (engine.completionStatus[requirementId]) {
        updateActionState(requirementId, { status: "complete" });
        return;
      }

      updateActionState(requirementId, {
        status: "running",
        retryCount: 0,
        lastRun: Date.now(),
        lastError: null,
      });
      addLog(requirementId, 0, "validate", "failure", "Initial validation — check not satisfied");

      // Recovery loop
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        if (abortRef.current) break;

        updateActionState(requirementId, {
          status: "recovering",
          retryCount: attempt,
        });

        // Step 1: Re-fetch data from DB
        addLog(requirementId, attempt, "re-fetch", "success", "Syncing state from database");

        // Cooldown
        await new Promise(r => setTimeout(r, COOLDOWN_MS));

        // Step 2: Re-validate
        const freshChecks = await revalidateChecks();
        const isNowValid = freshChecks[checkKey];

        if (isNowValid) {
          addLog(requirementId, attempt, "re-validate", "success", "Validation passed after sync");
          updateActionState(requirementId, {
            status: "complete",
            lastRun: Date.now(),
            lastError: null,
          });
          engine.logAudit(requirementId, "completed");
          return;
        }

        addLog(requirementId, attempt, "re-validate", "failure", `Check "${checkKey}" still false (attempt ${attempt}/${MAX_RETRIES})`);

        // Step 3: Force state sync
        if (attempt < MAX_RETRIES) {
          addLog(requirementId, attempt, "state-sync", "success", "Forcing cache invalidation & re-render");
          queryClient.invalidateQueries({ queryKey: REQUIREMENT_ENGINE_KEY });
          await new Promise(r => setTimeout(r, COOLDOWN_MS));
        }
      }

      // All retries exhausted
      updateActionState(requirementId, {
        status: "failed",
        lastRun: Date.now(),
        lastError: `Validation failed after ${MAX_RETRIES} attempts: "${checkKey}" not satisfied`,
      });
      addLog(requirementId, MAX_RETRIES, "exhausted", "failure", "Max retries reached — marked FAILED");
      engine.logAudit(requirementId, "failed");
    },
    [engine, queryClient, revalidateChecks, updateActionState, addLog]
  );

  // ─── Heal all actions ───────────────────────────────────────────

  const healAll = useCallback(async () => {
    abortRef.current = false;
    setIsHealingAll(true);

    const requirements = engine.requirements
      .filter(r => r.enabled && !engine.completionStatus[r.id])
      .sort((a, b) => a.priority - b.priority);

    for (const req of requirements) {
      if (abortRef.current) break;
      await executeAction(req.id, req.checkKey);
    }

    setIsHealingAll(false);
  }, [engine, executeAction]);

  // ─── Stop healing ──────────────────────────────────────────────

  const stopHealing = useCallback(() => {
    abortRef.current = true;
    setIsHealingAll(false);
  }, []);

  // ─── Reset failed action ────────────────────────────────────────

  const resetAction = useCallback(
    (requirementId: string) => {
      updateActionState(requirementId, {
        status: "not_started",
        retryCount: 0,
        lastError: null,
        recoveryLogs: [],
      });
    },
    [updateActionState]
  );

  // ─── Aggregated stats ──────────────────────────────────────────

  const stats = useMemo(() => {
    const all = engine.requirements.filter(r => r.enabled);
    const failedCount = all.filter(r => actionStates[r.id]?.status === "failed").length;
    const recoveringCount = all.filter(r => actionStates[r.id]?.status === "recovering").length;
    const runningCount = all.filter(r => actionStates[r.id]?.status === "running").length;
    return { failedCount, recoveringCount, runningCount };
  }, [engine.requirements, actionStates]);

  // ─── All recovery logs (flat) ──────────────────────────────────

  const allLogs = useMemo(() => {
    return Object.values(actionStates)
      .flatMap(s => s.recoveryLogs)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);
  }, [actionStates]);

  return {
    ...engine,
    actionStates,
    getActionStatus,
    executeAction,
    healAll,
    stopHealing,
    resetAction,
    isHealingAll,
    stats,
    allLogs,
  };
}
