/**
 * Client-side security event logger.
 * Sends events to the security_events table via RPC.
 */

import { supabase } from "@/integrations/supabase/client";

export type SecurityEventType =
  | "failed_login"
  | "failed_authorization"
  | "role_change"
  | "rapid_permission_changes"
  | "unusual_bulk_deletion"
  | "suspicious_api_usage"
  | "admin_role_change"
  | "workspace_settings_change"
  // ── Phase 2 identity events ─────────────────────────────────────
  | "mfa_enroll_started"
  | "mfa_enroll_completed"
  | "mfa_disabled"
  | "mfa_challenge_failed"
  | "password_changed"
  | "email_changed"
  | "step_up_succeeded"
  | "step_up_failed"
  | "session_idle_timeout"
  | "session_absolute_timeout"
  | "privileged_access_denied"
  | "privileged_access_granted";

interface SecurityEventPayload {
  event_type: SecurityEventType;
  severity?: "low" | "medium" | "high" | "critical";
  workspace_id?: string | null;
  details?: Record<string, unknown>;
  page_route?: string;
}

export const logSecurityEvent = async (payload: SecurityEventPayload): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.rpc("log_security_event" as any, {
      p_user_id: user?.id ?? null,
      p_workspace_id: payload.workspace_id ?? null,
      p_event_type: payload.event_type,
      p_severity: payload.severity ?? "medium",
      p_ip_address: null,
      p_user_agent: navigator.userAgent,
      p_page_route: payload.page_route ?? window.location.pathname,
      p_details: payload.details ?? {},
    });
  } catch (err) {
    // Silently fail — security logging should never break the app
    console.warn("Security event log failed:", err);
  }
};
