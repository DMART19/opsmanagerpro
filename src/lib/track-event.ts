/**
 * Lightweight product event tracking.
 * Fire-and-forget: never blocks the caller or shows errors to the user.
 */

import { supabase } from "@/integrations/supabase/client";

export type ProductEventType =
  | "website_visited"
  | "signup_completed"
  | "workspace_created"
  | "first_location_created"
  | "first_inventory_created"
  | "first_team_member_added"
  | "first_operation_completed"
  | "checkout_started"
  | "subscription_activated"
  | "subscription_cancelled"
  | "asset_created"
  | "asset_deleted"
  | "container_created"
  | "team_member_added"
  | "credential_added"
  | "pallet_saved"
  | "calendar_event_created";

const DEDUPED_EVENTS = new Set<ProductEventType>([
  "signup_completed",
  "workspace_created",
  "first_location_created",
  "first_inventory_created",
  "first_team_member_added",
  "first_operation_completed",
]);

const SENSITIVE_KEY = /(email|name|phone|address|token|secret|password)/i;

function safeMetadata(metadata?: Record<string, unknown>): Record<string, string | number | boolean | null> {
  if (!metadata) return {};

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key, value]) => !SENSITIVE_KEY.test(key) && ["string", "number", "boolean"].includes(typeof value))
      .slice(0, 10)
      .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 100) : value as number | boolean]),
  );
}

export const trackEvent = async (
  eventType: ProductEventType,
  metadata?: Record<string, unknown>
) => {
  try {
    if (eventType === "website_visited") {
      if (sessionStorage.getItem("opsmanagerpro:website-visited")) return;

      const { error } = await supabase.from("product_events").insert({
        event_type: eventType,
        user_id: null,
        workspace_id: null,
        metadata: {},
        dedupe_key: null,
        event_source: "client",
        is_test: false,
      });
      if (!error) sessionStorage.setItem("opsmanagerpro:website-visited", "1");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: workspaceId } = await supabase.rpc("get_effective_workspace_id");
    const effectiveWorkspaceId = workspaceId ?? user.id;

    await supabase.from("product_events").upsert({
      event_type: eventType,
      user_id: user.id,
      workspace_id: effectiveWorkspaceId,
      metadata: safeMetadata(metadata),
      dedupe_key: DEDUPED_EVENTS.has(eventType)
        ? `${effectiveWorkspaceId}:${eventType}`
        : null,
      event_source: "client",
      is_test: false,
    }, { onConflict: "dedupe_key", ignoreDuplicates: true });
  } catch {
    // Silently swallow – tracking must never disrupt the app
  }
};
