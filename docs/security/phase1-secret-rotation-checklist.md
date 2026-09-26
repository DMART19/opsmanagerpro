# Phase 1 production secret rotation checklist

This checklist contains secret names only. Never place secret values in source control, logs, tickets, or test fixtures.

## Secret inventory from the application

- Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_OPERATIONS_PRO`, `STRIPE_PRICE_OPERATIONS_ELITE`
- Scheduled jobs: `CRON_SECRET`
- AI gateway: `LOVABLE_API_KEY`, `LOVABLE_SEND_URL`

## Rotation procedure

1. Create a written change record and identify the control owner.
2. Rotate Supabase keys in the Supabase project settings; update Edge Function secrets and deployment configuration.
3. Rotate Stripe secret and webhook signing secrets in Stripe Dashboard; update Supabase secrets and webhook endpoint configuration.
4. Rotate `CRON_SECRET` in Supabase and every scheduler that invokes protected jobs.
5. Rotate `LOVABLE_API_KEY` and verify the AI provider account and data-processing terms before enabling any AI feature.
6. Verify email-provider credentials used by transactional email code in the provider dashboard and deployment secrets.
7. Update GitHub Actions/Lovable environment configuration without printing values.
8. Redeploy, run synthetic smoke tests, and confirm old credentials fail.
9. Record timestamps, owner, affected systems, and verification evidence. Do not record secret values.

## Startup validation rule

Edge Functions must report only missing variable names, for example:
`required configuration missing: STRIPE_WEBHOOK_SECRET`.
They must never print values, authorization headers, cookies, request bodies, provider response bodies, or full exception payloads.
