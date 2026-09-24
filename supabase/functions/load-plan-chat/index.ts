import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { buildCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { checkEntitlement } from "../_shared/entitlements.ts";

// --- Hardening limits ---
const MAX_BODY_BYTES = 32 * 1024;        // 32 KB request body
const MAX_MESSAGES = 20;                 // chat history depth
const MAX_MESSAGE_CHARS = 4000;          // per-message length
const MAX_TOTAL_CHARS = 20000;           // total prompt budget
const RATE_LIMIT_MAX = 30;               // 30 requests
const RATE_LIMIT_WINDOW_SEC = 60;        // per minute, per user

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
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
  messages: z.array(MessageSchema).min(1).max(MAX_MESSAGES),
  context: ContextSchema,
}).strict();

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    // --- 1. AuthN: require JWT ---
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.slice(7).trim();
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    // --- 2. AuthZ: require active workspace membership ---
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (!membership) {
      return jsonResponse(req, { error: "Forbidden" }, 403);
    }

    // --- 2b. AuthZ: require Logistics Pro tier or higher ---
    const ent = await checkEntitlement(userId, "operations_pro");
    if (!ent.allowed) {
      return jsonResponse(
        req,
        {
          error: ent.reason === "workspace_locked"
            ? "Workspace is inactive. Update billing to continue."
            : "AI Load Assistant requires the Logistics Pro plan or higher.",
          requiredPlan: "operations_pro",
        },
        403,
      );
    }

    // --- 3. Request size guard ---
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse(req, { error: "Request too large" }, 413);
    }
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return jsonResponse(req, { error: "Request too large" }, 413);
    }

    // --- 4. Schema validation ---
    let parsed: z.infer<typeof BodySchema>;
    try {
      parsed = BodySchema.parse(JSON.parse(raw));
    } catch (e) {
      const issues = e instanceof z.ZodError ? e.flatten().fieldErrors : undefined;
      return jsonResponse(req, { error: "Invalid request", issues }, 400);
    }

    const totalChars = parsed.messages.reduce((n, m) => n + m.content.length, 0);
    if (totalChars > MAX_TOTAL_CHARS) {
      return jsonResponse(req, { error: "Conversation too long" }, 413);
    }

    // --- 5. Per-user rate limit ---
    const rl = await checkRateLimit(
      "load-plan-chat",
      userId,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_SEC,
    );
    if (!rl.allowed) {
      return jsonResponse(
        req,
        { error: "Rate limit exceeded. Please slow down." },
        429,
        { "Retry-After": String(rl.retryAfterSec) },
      );
    }

    // --- 6. Gateway key ---
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("[load-plan-chat] LOVABLE_API_KEY missing");
      return jsonResponse(req, { error: "AI service unavailable" }, 503);
    }

    const systemPrompt = `You are a warehouse load-plan assistant inside OpsManagerPro.
You help the user understand and optimize their generated pallet + trailer load plan.
Be concise (2-4 short sentences). Use markdown bullet lists for multi-point answers.
If they ask whether something fits, reason from the totals provided.
Never invent numbers - only use what's in the context below.

Current plan context (JSON):
${JSON.stringify(parsed.context, null, 2)}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...parsed.messages],
      }),
    });

    if (resp.status === 429) {
      return jsonResponse(req, { error: "AI rate limit. Try again shortly." }, 429);
    }
    if (resp.status === 402) {
      return jsonResponse(
        req,
        { error: "AI credits exhausted. Add credits in Settings -> Workspace -> Usage." },
        402,
      );
    }
    if (!resp.ok) {
      // Log internals server-side; do NOT leak to caller.
      const text = await resp.text();
      console.error(`[load-plan-chat] gateway ${resp.status}:`, text.slice(0, 500));
      return jsonResponse(req, { error: "AI service error" }, 502);
    }

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content ?? "";
    return jsonResponse(req, { reply }, 200);
  } catch (e) {
    console.error("[load-plan-chat] unhandled", (e as Error).message);
    return jsonResponse(req, { error: "Internal error" }, 500);
  }
});