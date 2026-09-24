/**
 * Lightweight friction & workflow event tracking.
 * Fire-and-forget: never blocks the caller.
 */
import { supabase } from "@/integrations/supabase/client";

export type FrictionEventType =
  | "validation_error"
  | "rage_click"
  | "abandoned_workflow"
  | "repeated_action"
  | "gated_feature_attempt"
  | "disabled_click";

let _cachedUserId: string | null = null;

const getUserId = async (): Promise<string | null> => {
  if (_cachedUserId) return _cachedUserId;
  try {
    const { data } = await supabase.auth.getSession();
    _cachedUserId = data?.session?.user?.id ?? null;
    return _cachedUserId;
  } catch {
    return null;
  }
};

// Clear cache on auth state change
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedUserId = session?.user?.id ?? null;
});

export const trackFriction = async (
  eventType: FrictionEventType,
  pageRoute: string,
  elementLabel?: string,
  details?: Record<string, unknown>
) => {
  try {
    const userId = await getUserId();
    if (!userId) return; // Don't post analytics for anonymous visitors
    await (supabase as any).from("friction_events").insert({
      event_type: eventType,
      page_route: pageRoute,
      element_label: elementLabel || null,
      user_id: userId,
      details: details ?? {},
    });
  } catch {
    // Silent
  }
};

export const trackWorkflow = async (
  workflowName: string,
  step: "started" | "completed" | "abandoned",
  metadata?: Record<string, unknown>
) => {
  try {
    const userId = await getUserId();
    if (!userId) return;
    await (supabase as any).from("workflow_events").insert({
      workflow_name: workflowName,
      step,
      user_id: userId,
      metadata: metadata ?? {},
    });
  } catch {
    // Silent
  }
};

export const trackPagePerformance = async (pageRoute: string, loadTimeMs: number) => {
  try {
    const userId = await getUserId();
    if (!userId) return;
    await (supabase as any).from("page_performance").insert({
      page_route: pageRoute,
      load_time_ms: Math.round(loadTimeMs),
      user_id: userId,
    });
  } catch {
    // Silent
  }
};
