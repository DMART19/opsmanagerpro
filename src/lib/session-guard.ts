/**
 * Session Guard — Global fetch interceptor for session_not_found errors.
 *
 * SINGLE interceptor installed once at app startup.
 *
 * Strategy (conservative — never sign out on ordinary app errors):
 *  - Only inspects responses from the project's Supabase URL. Third-party
 *    403s (Stripe, image CDNs, etc.) are ignored.
 *  - Only reacts to explicit Supabase auth failure codes:
 *      • `session_not_found`
 *      • `refresh_token_not_found` / `refresh_token_already_used`
 *      • `bad_jwt` / `invalid_jwt`
 *    RLS denials (`42501`, `PGRST301`, `PGRST302`), permission errors,
 *    network failures, component crashes, and generic 401/403s DO NOT
 *    trigger a sign-out. They surface to the caller as normal errors.
 *  - On the first auth failure we attempt one silent token refresh. We
 *    only sign the user out when `refreshSession()` itself returns an
 *    error (i.e. the refresh token is truly dead) — never on transient
 *    network blips or app-level errors.
 */

import { supabase } from "@/integrations/supabase/client";

let installed = false;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

const AUTH_INVALID_CODES = new Set([
  "session_not_found",
  "refresh_token_not_found",
  "refresh_token_already_used",
  "bad_jwt",
  "invalid_jwt",
]);

function extractUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  try {
    return (input as Request).url ?? "";
  } catch {
    return "";
  }
}

function isSupabaseUrl(url: string): boolean {
  return !!SUPABASE_URL && url.startsWith(SUPABASE_URL);
}

function matchesAuthInvalid(body: any): boolean {
  if (!body || typeof body !== "object") return false;
  const code = body.error_code || body.code;
  if (typeof code === "string" && AUTH_INVALID_CODES.has(code)) return true;
  const msg: string =
    (typeof body.msg === "string" && body.msg) ||
    (typeof body.message === "string" && body.message) ||
    (typeof body.error_description === "string" && body.error_description) ||
    "";
  return [...AUTH_INVALID_CODES].some((c) => msg.includes(c));
}

let refreshInFlight: Promise<void> | null = null;

async function attemptRefreshOrSignOut() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        // Refresh definitively failed — session is dead. Sign out so the
        // app can redirect to /auth cleanly. Do NOT touch the route here.
        console.warn("[SessionGuard] Refresh failed, signing out:", error?.message);
        await supabase.auth.signOut().catch(() => {});
      }
    } catch (err) {
      // Network failure during refresh — do NOT sign the user out.
      // Next real user activity will retry.
      console.warn("[SessionGuard] Refresh threw (network?), keeping session:", err);
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export function installSessionGuard() {
  if (installed) return;
  installed = true;

  // Wrap AFTER error-capture has installed its interceptor.
  const currentFetch = window.fetch;

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await currentFetch(...args);

    // Scope: only inspect responses coming from THIS project's Supabase.
    // Any other 401/403 (Stripe, third-party APIs, our own edge functions
    // returning permission errors) MUST NOT trigger sign-out.
    if (response.status !== 401 && response.status !== 403) return response;
    const url = extractUrl(args[0] as RequestInfo);
    if (!isSupabaseUrl(url)) return response;

    try {
      const cloned = response.clone();
      const body = await cloned.json().catch(() => null);
      if (matchesAuthInvalid(body)) {
        // Real auth failure: try one silent refresh; only sign out if that
        // refresh definitively fails.
        attemptRefreshOrSignOut();
      }
      // Anything else (RLS 42501, PGRST3xx, generic 403, validation) is a
      // normal app error — surface to the caller unchanged.
    } catch {
      // ignore parse errors — never break the request
    }

    return response;
  };
}
