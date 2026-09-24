# Roadmap

## In progress
- [ ] Stripe subscription end-to-end audit (pricing, checkout, trials, upgrades/downgrades, cancellation, failed payments, webhook idempotency, portal, state sync)
- [ ] Align Stripe products and invoice descriptions to Starter $49, Operations $119, and Logistics Pro $249 (blocked: Stripe key needs Products Write permission)
- [x] September 14 pricing alignment: shared three-plan configuration, public offers, plan-aware signup (incl. email-verification hand-off), Enterprise removed from comparison table; CTA click-through verified
- [x] Verify plan preselection on /billing and the checkout step signed in (verified 2026-09-23: "Your pick" renders, all three price ids return a checkout session, unknown price id rejected)
- [x] Launch readiness audit (see docs/launch-readiness.md)
- [x] Launch readiness re-test 2026-09-23: telemetry findings closed, checkout guard firing, CTAs/plan handoff/billing preselect verified, frame-ancestors meta warning fixed

## Queued
- [x] Published 2026-09-23 — email update (trial/receipt/payment-failed emails) now live
- [ ] Publish again to ship Terms refund window change (60→30 days)
- [x] Terms section 4.1 Refunds & Cancellation added (needs owner sign-off on the commercial terms)
- [x] Wire "Update Payment Method" (BillingLifecycleSection) to the customer portal — done 2026-09-23
- [x] Scope feature_flags read policy to super admins; app resolves flags via is_feature_enabled RPC — done 2026-09-23 (verified: normal signed-in user reads 0 rows, RPC still works)

- [x] Telemetry insert policies now pin user_id = auth.uid() and bound values (verified: spoofed user_id and out-of-range values rejected)
- [x] create-checkout validates price active/currency/monthly/amount against PLAN_MONTHLY_PRICE (legacy $39/$89/$149 amounts temporarily allowed with a warning until Stripe repricing lands — remove LEGACY_AMOUNTS then)
- [x] Billing + trial emails: trial-started + receipt + payment-failed via stripe-webhook, trial-ending via expire-trials (3-day window, deduped through email_send_log)
- [x] CSP moved to public/_headers (verified 2026-09-23: no CSP <meta> in index.html)
- [x] Privacy Policy reconciled with real data flows (Google Fonts disclosed, IP capture on security events corrected, CSP now header-served, avatars listable, billing emails + delivery records, Section 6 cross-reference fixed)
- [x] Email-sending update applied 2026-09-23 (awaiting user review + publish to complete)
