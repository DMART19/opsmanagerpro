/**
 * useRequirementAdmin — Admin hook for requirement engine configuration
 *
 * Manages CRUD on requirement_configs, guidance_settings, and version history.
 * Includes validation layer for circular deps, missing deps, limits, etc.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { REQUIREMENTS, type Requirement, REQUIREMENT_ENGINE_KEY } from "./use-requirement-engine";
import type { ResolvedChecks } from "./use-requirement-engine";
import { useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────

export interface RequirementConfig {
  id: string;
  user_id: string;
  requirement_id: string;
  enabled: boolean;
  priority: number;
  label: string;
  explanation: string;
  depends_on: string[];
  required: boolean;
  is_core: boolean;
  group: string;
  check_key: string;
  resolve: string;
  created_at: string;
  updated_at: string;
}

export interface GuidanceSettings {
  sensitivity: "aggressive" | "balanced" | "minimal";
  enable_explanations: boolean;
  enable_idle_hints: boolean;
  enable_modal_simplification: boolean;
}

export interface ConfigVersion {
  id: string;
  version: number;
  config_snapshot: RequirementConfig[];
  change_description: string | null;
  changed_by: string | null;
  created_at: string;
}

// ─── Valid Check Keys & Resolve Keys ──────────────────────────────

const VALID_CHECK_KEYS: (keyof ResolvedChecks)[] = [
  "containers_exist",
  "items_exist",
  "items_assigned",
  "tasks_exist",
  "team_members_exist",
  "credentials_assigned",
];

const VALID_RESOLVE_KEYS = [
  "add_container_button",
  "add_item_button",
  "assign_item_action",
  "add_task_button",
  "add_team_member_button",
  "assign_credential_action",
];

const MAX_REQUIREMENTS = 15;
const MAX_PER_GROUP = 6;

// ─── Validation ───────────────────────────────────────────────────

export interface ValidationError {
  requirementId: string;
  field: string;
  message: string;
}

function detectCircularDeps(configs: RequirementConfig[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();

  const dfs = (id: string, path: string[]): boolean => {
    if (stack.has(id)) {
      errors.push({
        requirementId: id,
        field: "depends_on",
        message: `Circular dependency detected: ${[...path, id].join(" → ")}`,
      });
      return true;
    }
    if (visited.has(id)) return false;

    visited.add(id);
    stack.add(id);

    const config = configs.find(c => c.requirement_id === id);
    if (config) {
      for (const dep of config.depends_on) {
        if (dfs(dep, [...path, id])) return true;
      }
    }

    stack.delete(id);
    return false;
  };

  for (const config of configs) {
    dfs(config.requirement_id, []);
  }

  return errors;
}

export function validateConfigs(configs: RequirementConfig[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const ids = new Set(configs.map(c => c.requirement_id));

  // Check total limit
  if (configs.length > MAX_REQUIREMENTS) {
    errors.push({
      requirementId: "_global",
      field: "count",
      message: `Maximum ${MAX_REQUIREMENTS} requirements allowed (have ${configs.length})`,
    });
  }

  // Check per-group limit
  const groupCounts: Record<string, number> = {};
  for (const c of configs) {
    groupCounts[c.group] = (groupCounts[c.group] || 0) + 1;
    if (groupCounts[c.group] > MAX_PER_GROUP) {
      errors.push({
        requirementId: c.requirement_id,
        field: "group",
        message: `Maximum ${MAX_PER_GROUP} requirements per group (${c.group})`,
      });
    }
  }

  for (const config of configs) {
    // Core cannot be disabled
    if (config.is_core && !config.enabled) {
      errors.push({
        requirementId: config.requirement_id,
        field: "enabled",
        message: "Core requirements cannot be disabled",
      });
    }

    // Valid checkKey
    if (!VALID_CHECK_KEYS.includes(config.check_key as keyof ResolvedChecks)) {
      errors.push({
        requirementId: config.requirement_id,
        field: "check_key",
        message: `Invalid check key: ${config.check_key}`,
      });
    }

    // Valid resolve
    if (!VALID_RESOLVE_KEYS.includes(config.resolve)) {
      errors.push({
        requirementId: config.requirement_id,
        field: "resolve",
        message: `Invalid resolve element: ${config.resolve}`,
      });
    }

    // Missing dependencies
    for (const dep of config.depends_on) {
      if (!ids.has(dep)) {
        errors.push({
          requirementId: config.requirement_id,
          field: "depends_on",
          message: `Dependency "${dep}" does not exist`,
        });
      }
    }
  }

  // Circular deps
  errors.push(...detectCircularDeps(configs));

  return errors;
}

// ─── Query Keys ───────────────────────────────────────────────────

const ADMIN_CONFIG_KEY = ["requirement-admin-configs"];
const GUIDANCE_SETTINGS_KEY = ["guidance-settings"];
const CONFIG_VERSIONS_KEY = ["requirement-config-versions"];

// ─── Hook ─────────────────────────────────────────────────────────

export function useRequirementAdmin() {
  const queryClient = useQueryClient();

  // ── Fetch configs ──────────────────────────────────────────────
  const { data: configs, isLoading: configsLoading } = useQuery({
    queryKey: ADMIN_CONFIG_KEY,
    queryFn: async (): Promise<RequirementConfig[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from("requirement_configs")
        .select("*")
        .eq("user_id", user.id)
        .order("priority");

      if (error) throw error;
      return data || [];
    },
  });

  // ── Fetch guidance settings ────────────────────────────────────
  const { data: guidanceSettings, isLoading: settingsLoading } = useQuery({
    queryKey: GUIDANCE_SETTINGS_KEY,
    queryFn: async (): Promise<GuidanceSettings> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return defaultGuidanceSettings();

      const { data } = await (supabase as any)
        .from("guidance_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) return defaultGuidanceSettings();
      return {
        sensitivity: data.sensitivity,
        enable_explanations: data.enable_explanations,
        enable_idle_hints: data.enable_idle_hints,
        enable_modal_simplification: data.enable_modal_simplification,
      };
    },
  });

  // ── Fetch version history ──────────────────────────────────────
  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: CONFIG_VERSIONS_KEY,
    queryFn: async (): Promise<ConfigVersion[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await (supabase as any)
        .from("requirement_config_versions")
        .select("*")
        .eq("user_id", user.id)
        .order("version", { ascending: false })
        .limit(20);

      return data || [];
    },
  });

  // ── Initialize defaults (seed from hardcoded if no config exists) ──
  const initializeDefaults = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const seedData = REQUIREMENTS.map(r => ({
      user_id: user.id,
      requirement_id: r.id,
      enabled: true,
      priority: r.priority,
      label: r.label,
      explanation: r.explanation,
      depends_on: r.dependsOn,
      required: r.required,
      is_core: r.isCore,
      group: r.group,
      check_key: r.checkKey,
      resolve: r.resolve,
    }));

    const { error } = await (supabase as any)
      .from("requirement_configs")
      .upsert(seedData, { onConflict: "user_id,requirement_id" });

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ADMIN_CONFIG_KEY });
  }, [queryClient]);

  // ── Save configs (with validation + versioning) ────────────────
  const saveConfigs = useMutation({
    mutationFn: async ({ configs: newConfigs, description }: { configs: RequirementConfig[]; description?: string }) => {
      const validationErrors = validateConfigs(newConfigs);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.map(e => e.message).join("; "));
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save version snapshot first
      const currentVersion = (versions?.length || 0) + 1;
      await (supabase as any).from("requirement_config_versions").insert({
        user_id: user.id,
        version: currentVersion,
        config_snapshot: newConfigs,
        change_description: description || `Config update v${currentVersion}`,
        changed_by: user.id,
      });

      // Upsert all configs
      const upsertData = newConfigs.map(c => ({
        user_id: user.id,
        requirement_id: c.requirement_id,
        enabled: c.enabled,
        priority: c.priority,
        label: c.label,
        explanation: c.explanation,
        depends_on: c.depends_on,
        required: c.required,
        is_core: c.is_core,
        group: c.group,
        check_key: c.check_key,
        resolve: c.resolve,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await (supabase as any)
        .from("requirement_configs")
        .upsert(upsertData, { onConflict: "user_id,requirement_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_CONFIG_KEY });
      queryClient.invalidateQueries({ queryKey: CONFIG_VERSIONS_KEY });
      queryClient.invalidateQueries({ queryKey: REQUIREMENT_ENGINE_KEY });
    },
  });

  // ── Save guidance settings ─────────────────────────────────────
  const saveGuidanceSettings = useMutation({
    mutationFn: async (settings: GuidanceSettings) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase as any)
        .from("guidance_settings")
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GUIDANCE_SETTINGS_KEY });
    },
  });

  // ── Rollback to a version ──────────────────────────────────────
  const rollbackToVersion = useMutation({
    mutationFn: async (versionId: string) => {
      const version = versions?.find(v => v.id === versionId);
      if (!version) throw new Error("Version not found");

      const snapshot = version.config_snapshot as unknown as RequirementConfig[];
      await saveConfigs.mutateAsync({
        configs: snapshot,
        description: `Rolled back to v${version.version}`,
      });
    },
  });

  // Merge: if no DB configs yet, use hardcoded REQUIREMENTS
  const mergedConfigs: RequirementConfig[] = (configs && configs.length > 0)
    ? configs
    : REQUIREMENTS.map(r => ({
        id: "",
        user_id: "",
        requirement_id: r.id,
        enabled: true,
        priority: r.priority,
        label: r.label,
        explanation: r.explanation,
        depends_on: r.dependsOn,
        required: r.required,
        is_core: r.isCore,
        group: r.group,
        check_key: r.checkKey,
        resolve: r.resolve,
        created_at: "",
        updated_at: "",
      }));

  return {
    configs: mergedConfigs,
    configsLoading,
    guidanceSettings: guidanceSettings || defaultGuidanceSettings(),
    settingsLoading,
    versions: versions || [],
    versionsLoading,
    initializeDefaults,
    saveConfigs,
    saveGuidanceSettings,
    rollbackToVersion,
    validateConfigs,
    VALID_CHECK_KEYS,
    VALID_RESOLVE_KEYS,
  };
}

function defaultGuidanceSettings(): GuidanceSettings {
  return {
    sensitivity: "balanced",
    enable_explanations: true,
    enable_idle_hints: true,
    enable_modal_simplification: true,
  };
}
