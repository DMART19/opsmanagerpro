# Production acceptance gates

Revalidate documented findings against current code and live Stripe/Supabase settings. A prior audit is historical evidence, not proof of current state.

## Billing
- [ ] Confirm Stripe restricted-key permissions for customer and subscription operations in staging.
- [ ] Test advertised price mapping, checkout, signed webhook verification, duplicate delivery, subscription lifecycle, failed payment recovery, cancellation, and refunds.
- [ ] Verify unknown or manipulated price IDs are rejected and displayed totals match charged amounts.
- [ ] Exercise unpaid-account recovery and verify clear billing status.

## Tenant security
- [ ] Reconcile the scanner report against current migrations: staff insert/update policies already include WITH CHECK using has_workspace_permission(created_by, ...), and the helper checks authenticated owner/member context; custom_fields has a later authenticated-only owner-scoped policy. Confirm these migrations are applied in staging/production.
- [ ] Add and pass adversarial cross-workspace read/write tests for staff PII and custom_fields, including attempts to spoof created_by, anonymous access, inactive membership, and unauthorized role access.
- [ ] Confirm the live scanner findings clear after migrations are applied; keep unresolved findings blocking release.
- [ ] Review definer functions, service-role usage, and audit events for tenant-scope bypasses.

## Operations
- [ ] Run migrations and integration tests on staging; complete backup restore and rollback drills.
- [ ] Verify alert routing, incident response, customer support, privacy, and release documentation.
- [ ] Attach dated staging evidence and commit SHA before enabling live billing.
