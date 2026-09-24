import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PLAN_MONTHLY_PRICE, type PlanTier } from "../_shared/plan-limits.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  inventory: "Starter",
  operations: "Operations",
  operations_pro: "Logistics Pro",
  enterprise: "Enterprise",
};

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

/**
 * Warn workspaces whose trial ends within the next three days. The
 * idempotency key is the workspace plus its trial end date, and a matching
 * email_send_log row short-circuits the send, so each trial is warned once.
 */
async function sendTrialEndingNotices(
  supabase: ReturnType<typeof createClient>,
): Promise<{ sent: number; skipped: number }> {
  const now = new Date();
  const horizon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { data: plans, error } = await supabase
    .from("workspace_plans")
    .select("user_id, plan, trial_end_date, stripe_subscription_id")
    .eq("status", "trial")
    .gt("trial_end_date", now.toISOString())
    .lte("trial_end_date", horizon.toISOString());

  if (error) {
    console.log("[EXPIRE-TRIALS] Could not list ending trials", error.message);
    return { sent: 0, skipped: 0 };
  }

  let sent = 0;
  let skipped = 0;

  for (const plan of plans ?? []) {
    const userId = plan.user_id as string;
    const trialEnd = plan.trial_end_date as string | null;
    const idempotencyKey = `trial-ending:${userId}:${trialEnd ?? "unknown"}`;

    const { data: already } = await supabase
      .from("email_send_log")
      .select("id")
      .eq("template_name", "trial-ending")
      .contains("metadata", { idempotency_key: idempotencyKey })
      .limit(1);
    if (already && already.length > 0) {
      skipped++;
      continue;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const to = profile?.email as string | undefined;
    if (!to) {
      skipped++;
      continue;
    }

    const tier = plan.plan as PlanTier | null;
    const price = tier ? PLAN_MONTHLY_PRICE[tier] : undefined;
    const daysLeft = trialEnd
      ? Math.max(1, Math.ceil((new Date(trialEnd).getTime() - now.getTime()) / 86_400_000))
      : 3;

    try {
      const result = await sendTemplateEmail("trial-ending", to, {
        templateData: {
          planName: (tier && PLAN_DISPLAY_NAMES[tier]) || "your OpsManagerPro plan",
          daysLeft,
          trialEndDate: formatDate(trialEnd),
          monthlyPrice: typeof price === "number" ? `$${price}` : "",
          billingLink: "https://opsmanagerpro.com/billing",
        },
        idempotencyKey,
      });
      const { error: logError } = await supabase.from("email_send_log").insert({
        template_name: "trial-ending",
        recipient_email: to,
        status: result.sent ? "sent" : "suppressed",
        error_message: result.sent ? null : "Recipient is suppressed",
        metadata: { idempotency_key: idempotencyKey },
      });
      if (logError) console.log("[EXPIRE-TRIALS] log insert failed", logError.message);
      if (result.sent) sent++;
      else skipped++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const { error: logError } = await supabase.from("email_send_log").insert({
        template_name: "trial-ending",
        recipient_email: to,
        status: "failed",
        error_message: message,
        metadata: { idempotency_key: idempotencyKey },
      });
      if (logError) console.log("[EXPIRE-TRIALS] log insert failed", logError.message);
      console.log("[EXPIRE-TRIALS] trial-ending send failed", message);
    }
  }

  return { sent, skipped };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET");
    const providedSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("authorization") ?? "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    let authorized = (bearer && bearer === serviceRoleKey) || (cronSecret && providedSecret === cronSecret);
    if (!authorized && providedSecret) {
      const { data: tok } = await supabase
        .from("internal_cron_tokens")
        .select("token")
        .eq("name", "expire-trials")
        .maybeSingle();
      authorized = !!tok?.token && tok.token === providedSecret;
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.rpc("expire_trials");

    if (error) throw error;

    // Warning emails run after expiry so a trial that just ended is not warned.
    const notices = await sendTrialEndingNotices(supabase);

    return new Response(
      JSON.stringify({
        expired_count: data,
        trial_ending_emails_sent: notices.sent,
        trial_ending_emails_skipped: notices.skipped,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
