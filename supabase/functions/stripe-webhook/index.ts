import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { PLAN_ALLOWANCES, PLAN_MONTHLY_PRICE, type PlanTier } from "../_shared/plan-limits.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";
import { trackServerProductEvent } from "../_shared/track-product-event.ts";

/** Customer-facing plan names, matching the pricing page. */
const PLAN_DISPLAY_NAMES: Record<PlanTier, string> = {
  inventory: "Starter",
  operations: "Operations",
  operations_pro: "Logistics Pro",
  enterprise: "Enterprise",
};

function planLabel(tier: PlanTier | undefined | null): string {
  if (!tier) return "your OpsManagerPro plan";
  return PLAN_DISPLAY_NAMES[tier] ?? "your OpsManagerPro plan";
}

function monthlyPriceLabel(tier: PlanTier | undefined | null): string {
  if (!tier) return "";
  const price = PLAN_MONTHLY_PRICE[tier];
  return typeof price === "number" ? `$${price}` : "";
}

function formatMoney(amountCents: number | null | undefined, currency: string | null | undefined): string {
  if (typeof amountCents !== "number") return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `$${(amountCents / 100).toFixed(2)}`;
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Stripe Price ID -> internal plan tier.
 *
 * Price IDs can be overridden with environment values so prices can be
 * replaced without a code change. Allowances always come from the canonical
 * plan table, so this webhook can never store limits that disagree with what
 * the database enforces.
 */
function buildPriceMap(): Record<string, PlanTier> {
  const map: Record<string, PlanTier> = {
    // Current prices ($49 / $119 / $249 per month).
    "price_1UIrV6JkvedlgrWpPlDT28KQ": "inventory",
    "price_1UIrVAJkvedlgrWp3Kgkz0oJ": "operations",
    "price_1UIrVEJkvedlgrWpkO41dh6v": "operations_pro",
    // Legacy prices — kept so any existing subscription keeps working.
    "price_1SwtqUJkvedlgrWpeRPGNG6b": "inventory",
    "price_1TLZRvJkvedlgrWpsWweM3WZ": "operations",
    "price_1TLZTwJkvedlgrWpAWcfoZot": "operations_pro",
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

const PRICE_TO_TIER = buildPriceMap();

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

/**
 * Current period end. In recent Stripe API versions this lives on the
 * subscription item, not the subscription, so read both.
 */
function periodEndISO(sub: Stripe.Subscription): string | null {
  const raw =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    (sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined)
      ?.current_period_end;
  if (!raw || Number.isNaN(raw)) return null;
  return new Date(raw * 1000).toISOString();
}

function tsISO(seconds: number | null | undefined): string | null {
  if (!seconds || Number.isNaN(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("Missing Stripe configuration");
    return new Response(JSON.stringify({ error: "Configuration error" }), { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    logStep("Signature verification failed", { error: (err as Error).message });
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const eventCreated = new Date(event.created * 1000).toISOString();
  const objectId = (event.data.object as { id?: string })?.id ?? null;

  // --- Idempotency: claim the event, or acknowledge a repeat and stop. -----
  const { error: claimError } = await supabaseAdmin
    .from("stripe_webhook_events")
    .insert({
      event_id: event.id,
      event_type: event.type,
      event_created: eventCreated,
      stripe_object_id: objectId,
      status: "processing",
    });

  if (claimError) {
    // 23505 = unique violation: we have already seen this event id.
    if ((claimError as { code?: string }).code === "23505") {
      logStep("Duplicate event ignored", { id: event.id, type: event.type });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    logStep("Could not record event, asking Stripe to retry", { error: claimError.message });
    return new Response(JSON.stringify({ error: "Temporarily unavailable" }), { status: 500 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  /** Find the workspace this Stripe object belongs to. */
  async function findWorkspace(opts: {
    userId?: string | null;
    customerId?: string | null;
  }) {
    if (opts.userId) {
      const { data } = await supabaseAdmin
        .from("workspace_plans")
        .select("id, user_id, workspace_status, last_stripe_event_at, plan")
        .eq("user_id", opts.userId)
        .maybeSingle();
      if (data) return data;
    }
    if (opts.customerId) {
      const { data } = await supabaseAdmin
        .from("workspace_plans")
        .select("id, user_id, workspace_status, last_stripe_event_at, plan")
        .eq("stripe_customer_id", opts.customerId)
        .maybeSingle();
      if (data) return data;
    }
    return null;
  }

  /** The account email for a workspace owner, from the profiles mirror. */
  async function ownerEmail(userId: string | null | undefined): Promise<string | null> {
    if (!userId) return null;
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    return (data?.email as string | undefined) ?? null;
  }

  /**
   * Send a billing email and record the outcome. Email problems must never
   * fail the webhook: Stripe state has already been applied by this point.
   */
  async function sendBillingEmail(
    templateName: string,
    userId: string | null | undefined,
    templateData: Record<string, unknown>,
    idempotencyKey: string,
  ) {
    const to = await ownerEmail(userId);
    if (!to) {
      logStep("No recipient for billing email", { templateName, userId });
      return;
    }
    try {
      const result = await sendTemplateEmail(templateName, to, { templateData, idempotencyKey });
      const { error } = await supabaseAdmin.from("email_send_log").insert({
        template_name: templateName,
        recipient_email: to,
        status: result.sent ? "sent" : "suppressed",
        error_message: result.sent ? null : "Recipient is suppressed",
        metadata: { idempotency_key: idempotencyKey },
      });
      if (error) logStep("email_send_log insert failed", { code: error.code, message: error.message });
      logStep("Billing email processed", { templateName, sent: result.sent });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const { error } = await supabaseAdmin.from("email_send_log").insert({
        template_name: templateName,
        recipient_email: to,
        status: "failed",
        error_message: message,
        metadata: { idempotency_key: idempotencyKey },
      });
      if (error) logStep("email_send_log insert failed", { code: error.code, message: error.message });
      logStep("Billing email failed", { templateName, message });
    }
  }

  /**
   * Apply the authoritative subscription state from Stripe.
   * Stripe is the source of truth: we always write the full state derived from
   * the subscription object rather than patching fields per event type.
   */
  async function applySubscription(
    sub: Stripe.Subscription,
    workspace: { id: string; user_id?: string | null; last_stripe_event_at: string | null },
  ) {
    // Out-of-order guard: never let an older event overwrite newer state.
    if (workspace.last_stripe_event_at && workspace.last_stripe_event_at > eventCreated) {
      logStep("Stale event ignored", {
        id: event.id,
        eventCreated,
        lastApplied: workspace.last_stripe_event_at,
      });
      return;
    }

    const priceId = sub.items.data[0]?.price?.id ?? null;
    const tier = priceId ? PRICE_TO_TIER[priceId] : undefined;
    const periodEnd = periodEndISO(sub);

    const update: Record<string, unknown> = {
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      subscription_end_date: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      last_stripe_event_at: eventCreated,
    };

    if (tier) {
      update.plan = tier;
      update.max_assets = PLAN_ALLOWANCES[tier].maxAssets;
      update.max_team_members = PLAN_ALLOWANCES[tier].maxTeamMembers;
    } else if (priceId) {
      logStep("Unrecognised price, plan left unchanged", { priceId });
    }

    switch (sub.status) {
      case "trialing":
        update.status = "trial";
        update.workspace_status = "active";
        update.trial_end_date = tsISO(sub.trial_end);
        break;
      case "active":
        update.status = "active";
        update.workspace_status = "active";
        update.trial_end_date = null;
        break;
      case "past_due":
        // Stripe keeps retrying the payment; keep the workspace usable but warned.
        update.status = "past_due";
        update.workspace_status = "past_due";
        break;
      case "unpaid":
      case "canceled":
      case "incomplete_expired":
        update.status = "read_only";
        update.workspace_status = "read_only";
        break;
      case "incomplete":
        // Awaiting first payment/authentication; no access change yet.
        break;
      case "paused":
        update.status = "read_only";
        update.workspace_status = "read_only";
        break;
    }

    const { error } = await supabaseAdmin
      .from("workspace_plans")
      .update(update)
      .eq("id", workspace.id);

    if (error) throw new Error(`workspace_plans update failed: ${error.message}`);

    logStep("Subscription state applied", {
      workspaceId: workspace.id,
      stripeStatus: sub.status,
      plan: update.plan ?? "unchanged",
    });

    if (workspace.user_id && sub.status === "active") {
      await trackServerProductEvent(supabaseAdmin, {
        eventType: "subscription_activated",
        userId: workspace.user_id,
        workspaceId: workspace.user_id,
        dedupeKey: `subscription_activated:${sub.id}`,
        isTest: !event.livemode,
        metadata: tier ? { plan: tier } : {},
      });
    }

    if (workspace.user_id && sub.status === "canceled") {
      await trackServerProductEvent(supabaseAdmin, {
        eventType: "subscription_cancelled",
        userId: workspace.user_id,
        workspaceId: workspace.user_id,
        dedupeKey: `subscription_cancelled:${sub.id}`,
        isTest: !event.livemode,
        metadata: tier ? { plan: tier } : {},
      });
    }

    // Welcome the workspace into its trial. The idempotency key is the
    // subscription id, so repeated trialing events send only one email.
    if (sub.status === "trialing") {
      await sendBillingEmail(
        "trial-started",
        workspace.user_id,
        {
          planName: planLabel(tier),
          trialEndDate: formatDate(tsISO(sub.trial_end)),
          monthlyPrice: monthlyPriceLabel(tier),
          dashboardLink: "https://opsmanagerpro.com/dashboard",
        },
        `trial-started:${sub.id}`,
      );
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;

        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const workspace = await findWorkspace({
          userId: session.metadata?.user_id ?? sub.metadata?.user_id ?? null,
          customerId: session.customer as string,
        });

        if (!workspace) {
          logStep("No workspace matched for checkout session", { sessionId: session.id });
          break;
        }
        await applySubscription(sub, workspace);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
      case "customer.subscription.deleted": {
        const raw = event.data.object as Stripe.Subscription;
        // Re-read from Stripe so we act on current truth, not a stale payload.
        // Deleted subscriptions can still be retrieved.
        let sub = raw;
        try {
          sub = await stripe.subscriptions.retrieve(raw.id);
        } catch (err) {
          logStep("Could not re-read subscription, using event payload", {
            error: (err as Error).message,
          });
        }

        const workspace = await findWorkspace({
          userId: sub.metadata?.user_id ?? null,
          customerId: sub.customer as string,
        });
        if (!workspace) {
          logStep("No workspace matched for subscription", { subscriptionId: sub.id });
          break;
        }

        if (event.type === "customer.subscription.deleted") {
          if (workspace.last_stripe_event_at && workspace.last_stripe_event_at > eventCreated) {
            logStep("Stale delete ignored", { id: event.id });
            break;
          }
          const { error } = await supabaseAdmin
            .from("workspace_plans")
            .update({
              status: "read_only",
              workspace_status: "read_only",
              stripe_subscription_id: null,
              stripe_price_id: null,
              cancel_at_period_end: false,
              last_stripe_event_at: eventCreated,
            })
            .eq("id", workspace.id);
          if (error) throw new Error(error.message);
          logStep("Subscription ended, workspace set to read only", { workspaceId: workspace.id });
          if (workspace.user_id) {
            await trackServerProductEvent(supabaseAdmin, {
              eventType: "subscription_cancelled",
              userId: workspace.user_id,
              workspaceId: workspace.user_id,
              dedupeKey: `subscription_cancelled:${sub.id}`,
              isTest: !event.livemode,
              metadata: workspace.plan ? { plan: workspace.plan } : {},
            });
          }
          break;
        }

        await applySubscription(sub, workspace);
        break;
      }

      case "invoice.payment_failed":
      case "invoice.payment_succeeded":
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          (invoice as unknown as { subscription?: string | null }).subscription ??
          invoice.lines?.data?.[0]?.subscription ??
          null;

        // Derive state from the subscription itself so invoice events and
        // subscription events can never disagree.
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId as string);
          const workspace = await findWorkspace({
            userId: sub.metadata?.user_id ?? null,
            customerId: sub.customer as string,
          });
          if (!workspace) {
            logStep("No workspace matched for invoice", { invoiceId: invoice.id });
            break;
          }
          await applySubscription(sub, workspace);

          const invoicePriceId = sub.items.data[0]?.price?.id ?? null;
          const invoiceTier = invoicePriceId ? PRICE_TO_TIER[invoicePriceId] : undefined;

          if (event.type === "invoice.payment_failed") {
            await sendBillingEmail(
              "payment-failed",
              workspace.user_id,
              {
                planName: planLabel(invoiceTier),
                amountDue: formatMoney(invoice.amount_due, invoice.currency),
                nextAttemptDate: formatDate(tsISO(invoice.next_payment_attempt)),
                billingLink: "https://opsmanagerpro.com/billing",
              },
              `payment-failed:${invoice.id}`,
            );
          } else if (event.type === "invoice.paid" && (invoice.amount_paid ?? 0) > 0) {
            await sendBillingEmail(
              "payment-receipt",
              workspace.user_id,
              {
                planName: planLabel(invoiceTier),
                amountPaid: formatMoney(invoice.amount_paid, invoice.currency),
                paidOn: formatDate(new Date(event.created * 1000).toISOString()),
                periodEnd: formatDate(periodEndISO(sub)),
                invoiceNumber: invoice.number ?? "",
                invoiceLink: invoice.hosted_invoice_url ?? "https://opsmanagerpro.com/billing",
              },
              `payment-receipt:${invoice.id}`,
            );
          }
        } else {
          logStep("Invoice has no subscription, nothing to sync", { invoiceId: invoice.id });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    await supabaseAdmin
      .from("stripe_webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("event_id", event.id);
  } catch (err) {
    const message = (err as Error).message;
    logStep("Error processing webhook", { error: message });

    // Release the claim so Stripe's retry can process this event again.
    await supabaseAdmin.from("stripe_webhook_events").delete().eq("event_id", event.id);

    return new Response(JSON.stringify({ error: "Webhook processing failed" }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
