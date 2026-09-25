import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { type PlanTier, PLAN_MONTHLY_PRICE } from "../_shared/plan-limits.ts";
import { trackServerProductEvent } from "../_shared/track-product-event.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${d}`);
};

/**
 * Only prices we sell may be checked out. Without this allowlist a caller
 * could pass any price id and subscribe at the wrong amount.
 */
function allowedPrices(): Record<string, PlanTier> {
  const map: Record<string, PlanTier> = {
    "price_1UIrV6JkvedlgrWpPlDT28KQ": "inventory",
    "price_1UIrVAJkvedlgrWp3Kgkz0oJ": "operations",
    "price_1UIrVEJkvedlgrWpkO41dh6v": "operations_pro",
  };
  const env: Array<[string, PlanTier]> = [
    ["STRIPE_PRICE_STARTER", "inventory"],
    ["STRIPE_PRICE_OPERATIONS", "operations"],
    ["STRIPE_PRICE_LOGISTICS_PRO", "operations_pro"],
    ["STRIPE_PRICE_ENTERPRISE", "enterprise"],
  ];
  for (const [key, tier] of env) {
    const id = Deno.env.get(key);
    if (id) map[id] = tier;
  }
  return map;
}

const ALLOWED_ORIGINS = new Set([
  "https://app.opsmanagerpro.com",
  "https://opsmanagerpro.com",
  "https://www.opsmanagerpro.com",
  "https://fema-ops-hub.lovable.app",
]);

function fail(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) return fail("Please sign in to continue.", 401);

    const { priceId } = await req.json().catch(() => ({ priceId: null }));
    const priceMap = allowedPrices();
    if (!priceId || !priceMap[priceId]) {
      logStep("Rejected price id", { priceId });
      return fail("That plan is not available for self-service checkout.", 400);
    }

    logStep("Creating checkout", { userId: user.id, priceId });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("Stripe key missing");
      return fail("Billing is temporarily unavailable. Please try again shortly.", 503);
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verify the price in Stripe still matches what we advertise before we let
    // anyone be charged: right plan, right currency, monthly recurring, right
    // amount. This is the guard that catches a catalogue that drifted away from
    // the published pricing page.
    const tier = priceMap[priceId];
    const expectedDollars = PLAN_MONTHLY_PRICE[tier];
    let price: Stripe.Price;
    try {
      price = await stripe.prices.retrieve(priceId);
    } catch (e) {
      logStep("Price lookup failed", { priceId, message: e instanceof Error ? e.message : String(e) });
      return fail("Billing is temporarily unavailable. Please try again shortly.", 503);
    }

    const problems: string[] = [];
    if (!price.active) problems.push("price_inactive");
    if (price.currency !== "usd") problems.push(`currency:${price.currency}`);
    if (price.type !== "recurring") problems.push(`type:${price.type}`);
    if (price.recurring?.interval !== "month") problems.push(`interval:${price.recurring?.interval}`);
    if ((price.recurring?.interval_count ?? 1) !== 1) problems.push(`interval_count:${price.recurring?.interval_count}`);

    if (typeof expectedDollars === "number") {
      const expectedCents = expectedDollars * 100;
      if (price.unit_amount !== expectedCents) {
        problems.push(`amount:${price.unit_amount}!=${expectedCents}`);
      }
    }


    if (problems.length > 0) {
      logStep("Rejected price validation", { priceId, tier, problems });
      return fail(
        "This plan's billing details need attention before it can be purchased. Please contact support.",
        409,
      );
    }

    // The 14-day free trial is granted once, at signup, with no card required.
    // Checkout only adds a Stripe trial when this workspace has never trialled.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const { data: plan } = await supabaseAdmin
      .from("workspace_plans")
      .select("trial_start_date, stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (plan?.stripe_subscription_id) {
      return fail("A subscription is already linked to this workspace. Manage it in the billing portal.", 409);
    }

    const hasTrialledBefore = Boolean(plan?.trial_start_date);
    const grantTrial = !hasTrialledBefore;

    const customerId: string | undefined = plan?.stripe_customer_id ?? undefined;

    const rawOrigin = req.headers.get("origin") || "";
    const origin = ALLOWED_ORIGINS.has(rawOrigin) ? rawOrigin : "https://opsmanagerpro.com";

    const session = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        // Existing subscribers change plans in the billing portal, so checkout
        // is only for a first subscription.
        success_url: `${origin}/billing?checkout=success`,
        cancel_url: `${origin}/billing?checkout=canceled`,
        subscription_data: {
          ...(grantTrial ? { trial_period_days: 14 } : {}),
          metadata: { user_id: user.id },
        },
        metadata: { user_id: user.id },
        client_reference_id: user.id,
      },
      // A double-click cannot create two subscriptions, but the key rotates
      // hourly so an abandoned session never blocks a later attempt.
      {
        idempotencyKey: `checkout:${user.id}:${priceId}:${Math.floor(Date.now() / 3_600_000)}`,
      },
    );

    logStep("Checkout session created", { sessionId: session.id, grantTrial });

    await trackServerProductEvent(supabaseAdmin, {
      eventType: "checkout_started",
      userId: user.id,
      workspaceId: user.id,
      dedupeKey: `checkout_started:${session.id}`,
      isTest: !session.livemode,
      metadata: { plan: tier },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Never surface raw Stripe or internal messages to the browser.
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return fail("We could not start checkout. Please try again in a moment.", 502);
  }
});
