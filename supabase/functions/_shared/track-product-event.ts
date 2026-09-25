import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";

interface ServerProductEvent {
  eventType: "checkout_started" | "subscription_activated" | "subscription_cancelled";
  userId: string;
  workspaceId: string;
  dedupeKey: string;
  isTest?: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

/** Best-effort server telemetry. A tracking failure must not fail billing. */
export async function trackServerProductEvent(
  supabaseAdmin: SupabaseClient,
  event: ServerProductEvent,
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("product_events")
      .upsert(
        {
          event_type: event.eventType,
          user_id: event.userId,
          workspace_id: event.workspaceId,
          dedupe_key: event.dedupeKey,
          event_source: "stripe",
          is_test: event.isTest ?? false,
          metadata: event.metadata ?? {},
        },
        { onConflict: "dedupe_key", ignoreDuplicates: true },
      );

    if (error) {
      console.warn(`[PRODUCT-EVENT] ${event.eventType} was not recorded`, {
        code: error.code,
      });
    }
  } catch (error) {
    console.warn(`[PRODUCT-EVENT] ${event.eventType} tracking failed`, {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
