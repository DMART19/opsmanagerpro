/**
 * Data Access Logger — tracks when sensitive workspace data is accessed.
 * Fire-and-forget: never blocks the caller or shows errors to the user.
 * Logs are append-only and cannot be edited or deleted.
 */

import { supabase } from "@/integrations/supabase/client";

export type AccessObjectType =
  | "assets"
  | "containers"
  | "team_members"
  | "credentials"
  | "workspace_settings"
  | "calendar_tasks"
  | "pallet_layouts";

export type AccessActionType = "view" | "read" | "export" | "admin_view" | "admin_action";

interface LogDataAccessParams {
  objectType: AccessObjectType;
  actionType: AccessActionType;
  objectId?: string | null;
  metadata?: Record<string, unknown>;
  /** For admin access: the workspace owner's user_id the log belongs to */
  targetUserId?: string;
  /** For admin access: the admin's email for transparency */
  adminEmail?: string;
  /** Optional reason for admin access */
  accessReason?: string;
}

// Simple dedup: skip if same objectType+actionType logged within this window
const DEDUP_WINDOW_MS = 30_000; // 30 seconds
const recentLogs = new Map<string, number>();

/**
 * Check user's notification preferences and create alerts for data access events.
 */
const maybeCreateAccessAlert = async (
  userId: string,
  params: LogDataAccessParams,
  isAdminAccess: boolean,
): Promise<void> => {
  try {
    const { data: settings } = await (supabase as any)
      .from("notification_settings")
      .select("data_access_alerts, admin_access_alerts, large_export_alerts, large_export_threshold, in_app_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (!settings || !settings.in_app_enabled) return;

    // Admin access alert
    if (isAdminAccess && settings.admin_access_alerts) {
      await (supabase as any).from("user_notifications").insert({
        user_id: userId,
        title: "Platform Admin Access",
        message: `A platform administrator accessed your ${params.objectType.replace(/_/g, " ")} data${params.accessReason ? `: ${params.accessReason}` : ""}.`,
        type: "security",
        priority: "high",
        link: "/settings?tab=access-history",
      });
      return; // Don't double-notify
    }

    // Large export alert
    if (params.actionType === "export" && settings.large_export_alerts) {
      const count = (params.metadata?.count ?? params.metadata?.recordCount ?? 0) as number;
      const threshold = settings.large_export_threshold ?? 100;
      if (count >= threshold) {
        await (supabase as any).from("user_notifications").insert({
          user_id: userId,
          title: "Large Data Export",
          message: `${count} ${params.objectType.replace(/_/g, " ")} records were exported.`,
          type: "info",
          priority: "medium",
          link: "/settings?tab=access-history",
        });
        return;
      }
    }

    // General data access alert (only for read/export, not every view)
    if (settings.data_access_alerts && (params.actionType === "read" || params.actionType === "export")) {
      // Rate-limit general alerts to avoid flooding – max 1 per object type per 5 minutes
      const alertKey = `alert:${userId}:${params.objectType}`;
      const lastAlert = recentLogs.get(alertKey);
      const now = Date.now();
      if (lastAlert && now - lastAlert < 300_000) return;
      recentLogs.set(alertKey, now);

      await (supabase as any).from("user_notifications").insert({
        user_id: userId,
        title: "Data Accessed",
        message: `Your ${params.objectType.replace(/_/g, " ")} data was ${params.actionType === "export" ? "exported" : "accessed"}.`,
        type: "info",
        priority: "low",
        link: "/settings?tab=access-history",
      });
    }
  } catch {
    // Silently swallow — alerting must never disrupt the app
  }
};

// Cache workspace read-only status to avoid repeated queries
let _readOnlyCache: { value: boolean; ts: number } | null = null;
const READ_ONLY_CACHE_TTL = 60_000; // 1 minute

const isWorkspaceReadOnly = async (userId: string): Promise<boolean> => {
  const now = Date.now();
  if (_readOnlyCache && now - _readOnlyCache.ts < READ_ONLY_CACHE_TTL) {
    return _readOnlyCache.value;
  }
  try {
    const { data } = await (supabase as any)
      .from("workspace_plans")
      .select("workspace_status")
      .eq("user_id", userId)
      .maybeSingle();
    const readOnly = data?.workspace_status === "read_only" || data?.workspace_status === "archived";
    _readOnlyCache = { value: readOnly, ts: now };
    return readOnly;
  } catch {
    return false;
  }
};

export const logDataAccess = async (params: LogDataAccessParams): Promise<void> => {
  try {
    // Dedup check
    const key = `${params.objectType}:${params.actionType}:${params.objectId ?? "list"}:${params.targetUserId ?? "self"}`;
    const now = Date.now();
    const lastLogged = recentLogs.get(key);
    if (lastLogged && now - lastLogged < DEDUP_WINDOW_MS) return;
    recentLogs.set(key, now);

    // Prune old entries periodically
    if (recentLogs.size > 100) {
      for (const [k, ts] of recentLogs) {
        if (now - ts > DEDUP_WINDOW_MS) recentLogs.delete(k);
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isAdminAccess = !!params.targetUserId && params.targetUserId !== user.id;
    const ownerUserId = isAdminAccess ? params.targetUserId! : user.id;

    // Skip logging entirely for read-only workspaces — no INSERTs will succeed
    if (await isWorkspaceReadOnly(ownerUserId)) return;

    const { error: insertError } = await (supabase as any).from("data_access_logs").insert({
      user_id: ownerUserId,
      object_type: params.objectType,
      object_id: params.objectId ?? null,
      action_type: params.actionType,
      user_agent: navigator.userAgent,
      page_route: window.location.pathname,
      metadata: params.metadata ?? {},
      is_admin_access: isAdminAccess,
      admin_user_id: isAdminAccess ? user.id : null,
      admin_email: isAdminAccess ? (params.adminEmail ?? user.email) : null,
      access_reason: params.accessReason ?? null,
    });

    // Skip alert creation if insert failed
    if (insertError) return;

    // Fire-and-forget alert creation
    maybeCreateAccessAlert(ownerUserId, params, isAdminAccess);
  } catch {
    // Silently swallow — access logging must never disrupt the app
  }
};

/**
 * Convenience: log admin workspace access when teleporting.
 */
export const logAdminWorkspaceAccess = async (
  targetUserId: string,
  objectType: AccessObjectType,
  actionType: AccessActionType = "admin_view",
  metadata?: Record<string, unknown>,
  accessReason?: string,
): Promise<void> => {
  return logDataAccess({
    objectType,
    actionType,
    targetUserId,
    accessReason,
    metadata,
  });
};
