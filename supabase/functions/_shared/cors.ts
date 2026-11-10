// Browser CORS allowlist for Edge Functions. This is NOT authorization:
// every protected handler must independently validate identity and permissions.
const STATIC_ALLOWED = new Set<string>([
  "https://opsmanagerpro.com",
  "https://www.opsmanagerpro.com",
  "https://fema-ops-hub.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
]);

// Additional preview/staging origins must be explicitly configured, not
// accepted by wildcard domain matches. Comma-separated exact origins only.
// Example: CORS_ADDITIONAL_ORIGINS=https://my-preview.lovable.app
function configuredOrigins(): Set<string> {
  const raw = Deno.env.get("CORS_ADDITIONAL_ORIGINS") ?? "";
  return new Set(
    raw.split(",").map((value) => value.trim().replace(/\/$/, ""))
      .filter((value) => {
        try {
          const url = new URL(value);
          return url.origin === value && (
            url.protocol === "https:" ||
            (url.protocol === "http:" &&
              ["localhost", "127.0.0.1"].includes(url.hostname))
          );
        } catch {
          return false;
        }
      }),
  );
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return STATIC_ALLOWED.has(origin) || configuredOrigins().has(origin);
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  };
  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin!;
  }
  return headers;
}

export function jsonResponse(
  req: Request,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}
