import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { buildCorsHeaders, jsonResponse, rejectDisallowedOrigin } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { checkEntitlement } from "../_shared/entitlements.ts";
import {
  dispatchProviderRequest,
  IntegrationDispatchBlockedError,
} from "../_shared/integration-resilience.ts";

const MAX_BODY_BYTES = 32 * 1024;
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOTAL_CHARS = 20000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_SEC = 60;

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_MESSAGE_CHARS),
});

const ContextSchema = z.object({
  rowCount: z.number().int().nonnegative().max(1_000_000).default(0),
  totalWeight: z.number().nonnegative().max(1e9).default(0),
  totalVolume: z.number().nonnegative().max(1e9).default(0),
  pallet: z.string().max(200).optional(),
  vehicle: z.string().max(200).optional(),
  palletCount: z.number().int().nonnegative().max(100_000).optional(),
  utilization: z.number().min(0).max(100).optional(),
  alerts: z.array(z.string().max(500)).max(50).optional(),
}).strict();

const BodySchema = z.object({
  workspace_id: z.string().uuid(),
  messages: z.array(MessageSchema).min(1).max(MAX_MESSAGES),
  context: ContextSchema,
}).strict();

Deno.serve(async (req) => {
  const rejectedOrigin = rejectDisallowedOrigin(req);
  if (rejectedOrigin) return rejectedOrigin;
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const token = authHeader.slice(7).trim();
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (contentLength > MAX_BODY_BYTES) return jsonResponse(req, { error: "Request too large" }, 413);
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return jsonResponse(req, { error: "Request too large" }, 413);

    let parsed: z.infer<typeof BodySchema>;
    try {
      parsed = BodySchema.parse(JSON.parse(raw));
    } catch {
      return jsonResponse(req, { error: "Invalid request" }, 400);
    }

    const { data: membership, error: membershipError } = await admin
      .from("workspace_members")
      .select("workspace_owner_id")
      .eq("workspace_owner_id", parsed.workspace_id)
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (membershipError || !membership) return jsonResponse(req, { error: "Forbidden" }, 403);

    const { data: settings, error: settingsError } = await admin
      .from("workspace_settings")
      .select("contains_phi")
      .eq("user_id", parsed.workspace_id)
      .maybeSingle();
    if (settingsError || !settings) return jsonResponse(req, { error: "Forbidden" }, 403);
    if (settings.contains_phi === true) {
      return jsonResponse(req, { error: "AI features are unavailable for this workspace." }, 403);
    }

    const ent = await checkEntitlement(userId, "operations_pro");
    if (!ent.allowed) {
      return jsonResponse(req, {
        error: ent.reason === "workspace_locked"
          ? "Workspace is inactive. Update billing to continue."
          : "AI Load Assistant requires the Logistics Pro plan or higher.",
        requiredPlan: "operations_pro",
      }, 403);
    }

    const totalChars = parsed.messages.reduce((n, m) => n + m.content.length, 0);
    if (totalChars > MAX_TOTAL_CHARS) return jsonResponse(req, { error: "Conversation too long" }, 413);

    const rl = await checkRateLimit("load-plan-chat", userId, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SEC);
    if (!rl.allowed) {
      return jsonResponse(req, { error: "Rate limit exceeded. Please slow down." }, 429,
        { "Retry-After": String(rl.retryAfterSec) });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("[load-plan-chat] required configuration missing: LOVABLE_API_KEY");
      return jsonResponse(req, { error: "AI service unavailable" }, 503);
    }

    const systemPrompt = `You are a warehouse load-plan assistant inside OpsManagerPro.
You help the user understand and optimize their generated pallet + trailer load plan.
Be concise (2-4 short sentences). Use markdown bullet lists for multi-point answers.
If they ask whether something fits, reason from the totals provided.
Never invent numbers - only use what's in the context below.

Current plan context (JSON):
${JSON.stringify(parsed.context, null, 2)}`;

    let resp: Response;
    try {
      resp = await dispatchProviderRequest(
        admin,
        {
          companyId: parsed.workspace_id,
          provider: "https",
          capability: "ai.load_plan",
          operation: "lovable.chat.completions",
          circuitKey: "lovable-ai",
        },
        () => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "system", content: systemPrompt }, ...parsed.messages],
          }),
        }),
      );
    } catch (error) {
      if (error instanceof IntegrationDispatchBlockedError) {
        const status = error.code === "kill_switch" ? 503 : 503;
        const headers = error.retryAfterSeconds > 0
          ? { "Retry-After": String(error.retryAfterSeconds) }
          : {};
        return jsonResponse(req, {
          error: "Integration temporarily unavailable",
          reason: error.code,
        }, status, headers);
      }
      throw error;
    }

    if (resp.status === 429) return jsonResponse(req, { error: "AI rate limit. Try again shortly." }, 429);
    if (resp.status === 402) return jsonResponse(req, { error: "AI credits exhausted." }, 402);
    if (!resp.ok) {
      console.error(`[load-plan-chat] gateway status=${resp.status}`);
      return jsonResponse(req, { error: "AI service error" }, 502);
    }

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content ?? "";
    return jsonResponse(req, { reply }, 200);
  } catch {
    console.error("[load-plan-chat] unhandled request failure");
    return jsonResponse(req, { error: "Internal error" }, 500);
  }
});
