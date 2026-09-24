/**
 * useRequirementEngine — Enterprise Requirement Engine
 *
 * Portable, dependency-safe, future-proof requirement tracking.
 * Derives state ONLY from database counts. Re-runs after every mutation.
 * Global (not page-based). Multi-user safe.
 * 
 * Reads from admin config table when available, falls back to hardcoded defaults.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useMemo } from "react";

// ─── Check Resolvers ───────────────────────────────────────────────

export interface ResolvedChecks {
  containers_exist: boolean;
  items_exist: boolean;
  items_assigned: boolean;
  tasks_exist: boolean;
  team_members_exist: boolean;
  credentials_assigned: boolean;
}

// ─── Requirement Config ────────────────────────────────────────────

export interface Requirement {
  id: string;
  label: string;
  checkKey: keyof ResolvedChecks;
  resolve: string;
  explanation: string;
  group: "assets" | "calendar" | "team";
  dependsOn: string[];
  priority: number;
  required: boolean;
  isCore: boolean;
  enabled: boolean;
}

export const REQUIREMENTS: Requirement[] = [
  {
    id: "has_container",
    label: "Create Container",
    checkKey: "containers_exist",
    resolve: "add_container_button",
    explanation: "Create a place to organize your items",
    group: "assets",
    dependsOn: [],
    priority: 1,
    required: true,
    isCore: true,
    enabled: true,
  },
  {
    id: "has_item",
    label: "Add Item",
    checkKey: "items_exist",
    resolve: "add_item_button",
    explanation: "Track inventory items",
    group: "assets",
    dependsOn: ["has_container"],
    priority: 2,
    required: true,
    isCore: true,
    enabled: true,
  },
  {
    id: "has_assignment",
    label: "Assign Item",
    checkKey: "items_assigned",
    resolve: "assign_item_action",
    explanation: "Link items to containers",
    group: "assets",
    dependsOn: ["has_container", "has_item"],
    priority: 3,
    required: true,
    isCore: true,
    enabled: true,
  },
  {
    id: "has_task",
    label: "Add Task",
    checkKey: "tasks_exist",
    resolve: "add_task_button",
    explanation: "Schedule your first task",
    group: "calendar",
    dependsOn: [],
    priority: 4,
    required: true,
    isCore: false,
    enabled: true,
  },
  {
    id: "has_team_member",
    label: "Add Team Member",
    checkKey: "team_members_exist",
    resolve: "add_team_member_button",
    explanation: "Add your first team member to track credentials",
    group: "team",
    dependsOn: [],
    priority: 5,
    required: true,
    isCore: false,
    enabled: true,
  },
  {
    id: "has_credential_assignment",
    label: "Assign Credential",
    checkKey: "credentials_assigned",
    resolve: "assign_credential_action",
    explanation: "Assign a credential to track compliance",
    group: "team",
    dependsOn: ["has_team_member"],
    priority: 6,
    required: true,
    isCore: false,
    enabled: true,
  },
];

// ─── Completion Status ─────────────────────────────────────────────

export interface CompletionStatus {
  [requirementId: string]: boolean;
}

export interface RequirementEngineState {
  checks: ResolvedChecks;
  completionStatus: CompletionStatus;
  requirements: Requirement[];
  nextRequirement: Requirement | null;
  nextRequirementForGroup: (group: string) => Requirement | null;
  allRequiredComplete: boolean;
  groupComplete: (group: string) => boolean;
  completedCount: number;
  totalRequired: number;
  loading: boolean;
  refresh: () => void;
  logAudit: (requirementId: string, action: "completed" | "skipped" | "failed") => void;
}

// ─── Query Keys ────────────────────────────────────────────────────

export const REQUIREMENT_ENGINE_KEY = ["requirement-engine-checks"];
const ADMIN_CONFIG_KEY = ["requirement-admin-configs"];

// ─── Hook ──────────────────────────────────────────────────────────

export function useRequirementEngine(): RequirementEngineState {
  const queryClient = useQueryClient();

  // Fetch admin config overrides
  const { data: adminConfigs } = useQuery({
    queryKey: ADMIN_CONFIG_KEY,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await (supabase as any)
        .from("requirement_configs")
        .select("*")
        .eq("user_id", user.id)
        .order("priority");

      return (data && data.length > 0) ? data : null;
    },
    staleTime: 30_000,
  });

  // Merge admin config with hardcoded defaults
  const activeRequirements: Requirement[] = useMemo(() => {
    if (!adminConfigs) return REQUIREMENTS;

    return adminConfigs
      .filter((c: any) => c.enabled)
      .map((c: any) => ({
        id: c.requirement_id,
        label: c.label,
        checkKey: c.check_key as keyof ResolvedChecks,
        resolve: c.resolve,
        explanation: c.explanation,
        group: c.group as "assets" | "calendar",
        dependsOn: c.depends_on || [],
        priority: c.priority,
        required: c.required,
        isCore: c.is_core,
        enabled: c.enabled,
      }))
      .sort((a: Requirement, b: Requirement) => a.priority - b.priority);
  }, [adminConfigs]);

  const { data: checks, isLoading } = useQuery({
    queryKey: REQUIREMENT_ENGINE_KEY,
    queryFn: async (): Promise<ResolvedChecks> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          containers_exist: false,
          items_exist: false,
          items_assigned: false,
          tasks_exist: false,
          team_members_exist: false,
          credentials_assigned: false,
        };
      }

      const [containersResult, itemsResult, assignedResult, tasksResult, teamResult, credResult] = await Promise.all([
        supabase
          .from("cache_inventory")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("asset_type", "container")
          .is("deleted_at", null),
        supabase
          .from("cache_inventory")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("asset_type", "item")
          .is("deleted_at", null),
        supabase
          .from("cache_inventory")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("asset_type", "item")
          .is("deleted_at", null)
          .not("container_id", "is", null),
        (supabase as any)
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("deleted_at", null),
        supabase
          .from("employee_requirements")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      return {
        containers_exist: (containersResult.count ?? 0) > 0,
        items_exist: (itemsResult.count ?? 0) > 0,
        items_assigned: (assignedResult.count ?? 0) > 0,
        tasks_exist: (tasksResult.count ?? 0) > 0,
        team_members_exist: (teamResult.count ?? 0) > 0,
        credentials_assigned: (credResult.count ?? 0) > 0,
      };
    },
    staleTime: 5_000,
    refetchOnMount: "always",
  });

  const resolvedChecks: ResolvedChecks = checks ?? {
    containers_exist: false,
    items_exist: false,
    items_assigned: false,
    tasks_exist: false,
    team_members_exist: false,
    credentials_assigned: false,
  };

  const completionStatus: CompletionStatus = useMemo(() => {
    const status: CompletionStatus = {};
    for (const req of activeRequirements) {
      if (!(req.checkKey in resolvedChecks)) {
        console.error(`[RequirementEngine] Unknown checkKey: ${req.checkKey} for requirement ${req.id}`);
        status[req.id] = false;
        continue;
      }
      status[req.id] = resolvedChecks[req.checkKey];
    }
    return status;
  }, [resolvedChecks, activeRequirements]);

  /**
   * getNextRequirement — deterministic single-active resolver.
   *
   * 1. enabled only
   * 2. dependencies satisfied (same-group, backward-only enforced at generation)
   * 3. sort by priority
   * 4. return FIRST incomplete
   *
   * GUARANTEE: ONE active requirement, deterministic output, no conflicts.
   */
  const getNextRequirement = useCallback(
    (filterGroup?: string): Requirement | null => {
      return activeRequirements
        .filter((r) => r.enabled)
        .filter((r) => !filterGroup || r.group === filterGroup)
        .filter((r) => !completionStatus[r.id])
        .filter((r) =>
          r.dependsOn.every((dep) => completionStatus[dep] === true)
        )
        .sort((a, b) => a.priority - b.priority)[0] ?? null;
    },
    [completionStatus, activeRequirements]
  );

  const nextRequirement = useMemo(() => getNextRequirement(), [getNextRequirement]);

  const nextRequirementForGroup = useCallback(
    (group: string) => getNextRequirement(group),
    [getNextRequirement]
  );

  const allRequiredComplete = useMemo(() => {
    return activeRequirements.filter((r) => r.required && r.enabled).every((r) => completionStatus[r.id]);
  }, [completionStatus, activeRequirements]);

  const groupComplete = useCallback(
    (group: string) => {
      return activeRequirements.filter((r) => r.group === group && r.required && r.enabled).every(
        (r) => completionStatus[r.id]
      );
    },
    [completionStatus, activeRequirements]
  );

  const completedCount = useMemo(() => {
    return activeRequirements.filter((r) => r.required && r.enabled && completionStatus[r.id]).length;
  }, [completionStatus, activeRequirements]);

  const totalRequired = activeRequirements.filter((r) => r.required && r.enabled).length;

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: REQUIREMENT_ENGINE_KEY });
    queryClient.invalidateQueries({ queryKey: ADMIN_CONFIG_KEY });
  }, [queryClient]);

  const logAudit = useCallback(
    async (requirementId: string, action: "completed" | "skipped" | "failed") => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await (supabase as any).from("requirement_audit_log").insert({
          user_id: user.id,
          requirement_id: requirementId,
          action,
        });
      } catch {
        // Non-critical
      }
    },
    []
  );

  return {
    checks: resolvedChecks,
    completionStatus,
    requirements: activeRequirements,
    nextRequirement,
    nextRequirementForGroup,
    allRequiredComplete,
    groupComplete,
    completedCount,
    totalRequired,
    loading: isLoading,
    refresh,
    logAudit,
  };
}
