# Production acceptance gates

Revalidate documented findings against current code and live Stripe/Supabase settings. A prior audit is historical evidence, not proof of current state.

## Billing
- [ ] Confirm Stripe restricted-key permissions for customer and subscription operations in staging.
- [ ] Test advertised price mapping, checkout, signed webhook verification, duplicate delivery, subscription lifecycle, failed payment recovery, cancellation, and refunds.
- [ ] Verify unknown or manipulated price IDs are rejected and displayed totals match charged amounts.
- [ ] Exercise unpaid-account recovery and verify clear billing status.

## Tenant security
- [ ] Fix the documented staff PII workspace-scope issue and verify tenant identity derives from trusted auth context.
- [ ] Restrict custom-field policies to authenticated roles as appropriate.
- [ ] Add cross-tenant read/write denial tests for every PII-bearing and workspace-owned table.
- [ ] Review definer functions, service-role usage, and audit events for tenant-scope bypasses.

## Operations
- [ ] Run migrations and integration tests on staging; complete backup restore and rollback drills.
- [ ] Verify alert routing, incident response, customer support, privacy, and release documentation.
- [ ] Attach dated staging evidence and commit SHA before enabling live billing.
