/**
 * Lightweight product event tracking.
 * Fire-and-forget: never blocks the caller or shows errors to the user.
 */

import { supabase } from "@/integrations/supabase/client";

export type ProductEventType =
  | "asset_created"
  | "asset_deleted"
  | "container_created"
  | "team_member_added"
  | "credential_added"
  | "pallet_saved"
  | "calendar_event_created";

export const trackEvent = async (
  eventType: ProductEventType,
  metadata?: Record<string, unknown>
) => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return; // Skip tracking for unauthenticated / demo users

    await supabase.from("product_events" as any).insert({
      event_type: eventType,
      user_id: user.id,
      workspace_id: null,
      metadata: metadata ?? {},
    });
  } catch {
    // Silently swallow – tracking must never disrupt the app
  }
};
