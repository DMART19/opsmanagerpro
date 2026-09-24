// Per-user rate limiter backed by public.rate_limits.
// Uses a fixed window per (key, user_id, window_start-truncated).
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function checkRateLimit(
  key: string,
  userId: string,
  maxHits: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const admin = adminClient();
  const nowMs = Date.now();
  const windowStartMs = Math.floor(nowMs / (windowSeconds * 1000)) * windowSeconds * 1000;
  const windowStart = new Date(windowStartMs).toISOString();

  // Try insert; if conflict, increment.
  const { error: insertErr } = await admin
    .from("rate_limits")
    .insert({
      key,
      user_id: userId,
      window_start: windowStart,
      hit_count: 1,
      max_hits: maxHits,
      window_seconds: windowSeconds,
    });

  if (!insertErr) {
    return { allowed: true, remaining: maxHits - 1, retryAfterSec: 0 };
  }

  // On unique-violation, increment existing row.
  const { data, error: updErr } = await admin.rpc("increment_rate_limit", {
    p_key: key,
    p_user_id: userId,
    p_window_start: windowStart,
  }).maybeSingle();

  if (updErr || !data) {
    // Fail-open to avoid bricking the endpoint, but log.
    console.warn("[rate-limit] increment failed", updErr?.message);
    return { allowed: true, remaining: 0, retryAfterSec: 0 };
  }

  const hitCount = (data as { hit_count: number }).hit_count ?? 0;
  if (hitCount > maxHits) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((windowStartMs + windowSeconds * 1000 - nowMs) / 1000),
    );
    return { allowed: false, remaining: 0, retryAfterSec };
  }
  return { allowed: true, remaining: Math.max(0, maxHits - hitCount), retryAfterSec: 0 };
}