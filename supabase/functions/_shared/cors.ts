// Origin allowlist for browser-callable edge functions.
// Server-to-server endpoints (webhooks) should not call these helpers.

const STATIC_ALLOWED = new Set<string>([
  "https://opsmanagerpro.com",
  "https://www.opsmanagerpro.com",
  "https://fema-ops-hub.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
]);

const PREVIEW_PATTERNS: RegExp[] = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
];

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (STATIC_ALLOWED.has(origin)) return true;
  return PREVIEW_PATTERNS.some((re) => re.test(origin));
}

export function isCorsRequestAllowed(req: Request): boolean {
  const origin = req.headers.get("Origin");
  return !origin || isAllowedOrigin(origin);
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
  if (origin && isAllowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
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

export function rejectDisallowedOrigin(req: Request): Response | null {
  if (isCorsRequestAllowed(req)) return null;
  return jsonResponse(req, { error: "Origin not allowed" }, 403);
}
