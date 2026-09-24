# OpsManagerPro — Launch Readiness Audit

Date: 2026-09-23. Scope: self-serve SMB/mid-market launch (not enterprise
procurement — see `docs/enterprise/` for that track).

Verdict: **not ready to take live payments today.** One hard blocker
(published prices do not match what Stripe charges) plus one dead recovery
path for unpaid accounts. Everything else is either clean or a
nice-to-have.

## What was verified in this audit

| Check | Result |
|---|---|
| TypeScript compile (`tsconfig.app.json`) | Clean, no errors |
| Build log | No build errors |
| Hosted backend (auth + database) | Reachable, ~120ms |
| Runtime errors in preview telemetry | None |
| `<head>` title / description / OG / Twitter / JSON-LD | Present, product-specific, `public/og-image.jpg` exists |
| robots.txt, sitemap.xml, llms.txt | Present |
| Billing page plan preselection (`/billing?plan=operations`) | Works — Operations card shows "Your pick" |
| Displayed plan prices on /billing | $49 / $119 / $249, names Starter / Operations / Logistics Pro |
| Enterprise removed from public offers | Confirmed absent from pricing cards and comparison table |
| Checkout price mapping (signed in, live key, no purchase completed) | All three allowlisted prices return a session URL; an unknown price id is rejected 400 |
| Security scan | 1 error, 5 warn, 1 info (below) |

## P0 — blocks launch

1. **~~Live Stripe prices do not match the published prices.~~ DONE 2026-09-23.**
   New live monthly prices created and set as each product's default price:
   - `price_1UIrV6JkvedlgrWpPlDT28KQ` → $49 (Starter, `prod_TujJGVMfRZSjfn`)
   - `price_1UIrVAJkvedlgrWp3Kgkz0oJ` → $119 (Operations, `prod_UKDtLyOn3zh9oQ`)
   - `price_1UIrVEJkvedlgrWpkO41dh6v` → $249 (Logistics Pro, `prod_UKDvFzYE3utcPl`)
   Products renamed to "OpsManagerPro – Starter / Operations / Logistics Pro".
   `src/config/stripe-plans.ts` and the `create-checkout` allowlist now point at
   the new ids only (old ids rejected 400); `stripe-webhook` still maps the
   legacy ids so existing subscribers are untouched. `LEGACY_AMOUNTS` removed —
   checkout now enforces the exact advertised amount.
2. **Restricted Stripe key is missing Customers read/write.** After the
   permission edit, `create-checkout` fails with "Enabling Customers Read
   ('customer_read') permissions on this key would allow this request to
   continue" for all three new prices. Grant **Customers read + write** (and
   keep Prices/Products write, Checkout Sessions write, Accounts read) on
   `rk_live_…JUVF`, then re-run the checkout mapping test.

2. **"Update Payment Method" is a disabled "(Coming Soon)" button.**
   `src/components/billing/BillingLifecycleSection.tsx` renders it for
   `past_due`, `read_only`, and `archived` workspaces — exactly the accounts
   that need to pay. Wire it to the existing `customer-portal` function.

3. **Any signed-in user can read every row of `feature_flags`** (scanner
   level: error). Discloses unreleased-feature names across tenants. Scope the
   read policy to the caller's workspace or to admins.

## P1 — fix soon after launch

- Five analytics/telemetry tables accept inserts from any signed-in user with
  no check on contents: `demo_feedback`, `friction_events`,
  `page_performance`, `performance_metrics`, `workflow_events`. Add
  `WITH CHECK` that pins `user_id`/workspace to the caller.
- `create-checkout` trusts its price-id allowlist but never verifies the
  price's amount, currency, or monthly interval against the plan being sold.
  Add a Stripe price lookup and reject a mismatch — this is the guard that
  would have caught blocker #1 automatically.
- No billing or trial-lifecycle emails exist in the repo (only identity
  emails: signup, invite, magic link, recovery, email change, reauth). Trial
  start, trial ending, payment failed, and receipt emails are unconfigured.
- `avatars` storage bucket is publicly listable (scanner: info). Acceptable if
  avatars are meant to be public; otherwise restrict listing.
- Content-Security-Policy `frame-ancestors` is delivered via `<meta>`, where
  browsers ignore it. Move it to `public/_headers`.
- React Router v6 future-flag deprecation warnings in the console — noise
  only, but they will become breaking on a v7 upgrade.

## P2 — not launch-blocking

- Refund policy is still unspecified in the legal pack.
- Privacy Policy has not been reconciled against the app's real data flows and
  processors (already queued in `roadmap.md`).
- Enterprise tier remains in internal config for entitlement compatibility;
  confirm no public surface reintroduces it.

## Not in scope

Enterprise procurement gaps (SAML/SCIM, signed audit export, MSA/DPA/SLA,
on-prem) are tracked separately in `docs/enterprise/00-executive-summary.md`
and do not block an SMB launch.


---

## Re-test — 2026-09-23 14:2x UTC

**Verified pass**
- Typecheck clean; build OK; no runtime errors; no console errors on landing, pricing section, billing, or legal pages.
- Backend (database + auth) reachable, ~91ms.
- Security scan: 2 active findings (was 7). The five telemetry insert findings are resolved — a spoofed `user_id` insert into `friction_events` is rejected at the database, a legitimate one succeeds, out-of-range values rejected.
- Public pricing shows $49 / $119 / $249 only. No "$39/$89/$149", no "Enterprise", no "Custom pricing" on the landing page. Mobile (390px) pricing has no horizontal overflow.
- CTA destinations: hero "Start 14-Day Free Trial" -> /auth?mode=signup; closing "Start Free Trial" -> /auth?mode=signup; "Start Starter" -> ?mode=signup&plan=inventory; "Start Operations" -> plan=operations; "Start Logistics Pro" -> plan=operations_pro; "Sign in" -> /auth?mode=signin.
- /billing?plan=operations_pro renders the "Your pick" marker on the correct card. (Note: preselection is driven by the `plan` URL parameter, which `planAwareRedirect` supplies — not by localStorage alone.)
- create-checkout: all three allowlisted prices return a live checkout session; an unknown price id is rejected 400. No purchase completed.
- New checkout price guard is live and firing: logs show `WARNING legacy price amount still live` for all three tiers (3900 vs 4900, 8900 vs 11900, 14900 vs 24900).
- Terms contain "Refunds & Cancellation"; Privacy Policy discloses Google Fonts.
- Fixed during this run: `frame-ancestors` removed from the runtime <meta> CSP (it is served from public/_headers), clearing the repeated browser console warning.

**Still blocking real payments**
1. Stripe repricing done 2026-09-23 ($49/$119/$249, products renamed, checkout repointed). Remaining: the restricted key needs **Customers read + write** — checkout currently fails with a Stripe permission error on all three new prices.
2. "Update Payment Method" still renders as a disabled "Coming Soon" on the billing page; wire to the existing `customer-portal` function.
3. `feature_flags`: any signed-in user can read every row (security scan, error level).

**Info / low**
- `avatars` bucket file list is readable without signing in (already disclosed in the Privacy Policy).
- Email update is applied and deployed but takes effect only on publish.
