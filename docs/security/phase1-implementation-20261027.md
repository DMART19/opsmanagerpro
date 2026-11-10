# OpsManagerPro Phase 1 — Security Implementation (2026-10-27)

Status: **code staged for review; NOT deployed or production-validated**.
Branch: `security/phase1-tenant-isolation-20261027`.

## Implemented in this branch

1. **Staff PII RLS**: A new migration drops known legacy OR-combined policies,
   explicitly scopes team operations to the authenticated identity's own or
   server-resolved effective workspace, and requires the existing `manage_team`
   permission for writes. Super-admin access remains SELECT-only.
   Migration refuses to run if unknown staff policies exist. This is
   intentional: unexpected permissive policies must be reviewed, not bypassed.
2. **Custom fields**: The existing read/manage predicates are retained and the
   two current policies explicitly require `TO authenticated`.
3. **Global feature flags**: Removes the broad authenticated catalogue SELECT\n   policy (including if an older Drizzle migration was not applied), and\n   constrains the SECURITY DEFINER resolver to the authenticated caller's\n   workspace or authorized platform super-admin. A rollback-only test checks\n   unauthorized workspace override queries.\n4. **CORS**: Shared browser CORS now uses exact production/development origins
   and an optional exact-origin `CORS_ADDITIONAL_ORIGINS` list. No wildcard
   preview subdomain matching or arbitrary origin reflection.
5. **Test gates**: Static regression tests, Deno CORS tests, and CI build/lint/
   typecheck are added; a separate **rollback-only SQL acceptance test**
   exercises owners, workspace members, forged tenant IDs, read/write isolation,
   and custom-field role scoping.
6. **Inventory**: `scripts/security/inspect_rls.sql` captures database
   authorization posture for manual audit.

## Security limitations / deferred work

- `get_effective_workspace_id()` currently resolves one active workspace with
  `LIMIT 1`; multiple simultaneous active workspace memberships require a
  separate explicit workspace-selection design. The migration deliberately
  does **not** introduce a client-controlled workspace selector.
- For staff records created by workspace members using their own ID, the
  `created_by = auth.uid()` path preserves personal-workspace ownership.
  Review the product's intended member-creation behavior before expanding this.
- The SQL acceptance test requires an isolated Supabase database with
  `auth.users` and application schema; it is **not executed by CI**.
- No customer data, Supabase instance, or production environment was modified.
- Not every Edge Function currently uses `_shared/cors.ts`; each function
  requires separate authorization/CORS review before Phase 1 can be marked done.
- `verify_jwt = false` in `supabase/config.toml` can be appropriate for
  authenticated webhooks, cron functions, or handlers that verify tokens inside
  the handler. It does **not** itself prove a vulnerability; verify each path.

## Staging-only rollout sequence

1. Capture current `pg_policies`, RLS flags, function permissions, and schema
   migration state using `scripts/security/inspect_rls.sql`.
2. Compare `staff` policy names with the migration's fail-closed allowlist.
   If there are unknown policies, **stop** and review them before updating.
3. Validate data ownership mappings, especially any `staff.created_by` values
   that do not represent a current workspace owner. Do not rewrite PII ownership
   automatically.
4. Create a **disposable Supabase development branch/project** with its own
   database, apply migrations there, and run:
   `psql "$DISPOSABLE_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase1_staff_rls_acceptance.sql`.
   NEVER run this synthetic fixture test against production.
5. Test ordinary staff insert/edit/delete in the staging UI for owners,
   workspace admins, viewers, and users with multiple memberships.
6. On preview environments, set an exact origin such as
   `CORS_ADDITIONAL_ORIGINS=https://your-preview.lovable.app` on the Edge
   Functions deployment. Test accepted and rejected preflight requests.
7. Review CI and environment-gated results, then authorize production rollout
   separately with backup, rollback, and smoke-test procedures.

## Phase 1 exit gates (not yet satisfied)

- RLS tests: read/update/delete/insert isolation proven in a real disposable DB.
- No unknown broad permissive customer-table policies.
- Every exposed Edge Function has an explicit auth and authorization decision.
- Storage buckets and signed URL lifetimes reviewed.
- Security CI checks pass for the exact commit.
- Production rollout is explicitly approved and post-deployment smoke-tested.
