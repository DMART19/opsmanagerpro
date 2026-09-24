# 04 — Security Gaps

Concrete security findings tied to code and scanner output at audit time. Severity uses CVSS-inspired categories: **Critical**, **High**, **Medium**, **Low**, **Informational**.

## Active scanner findings (persisted, `supabase_lov` scanner)

### 1. `staff` table — workspace scoping via `created_by` ⚠️ **High**

**Finding:** `staff_manage_*` and `staff_view_team` policies use `has_workspace_permission(created_by, ...)`. `staff` contains PII (email, phone, address, emergency contact). If a non-owner can set `created_by` to another workspace's owner id on insert, sensitive PII could be written cross-tenant or leaked.

**Evidence:** Persisted scanner internal_id `staff_created_by_manage_permission`.

**Remediation:**
- Add an explicit `WITH CHECK` clause that ties `created_by` to the effective workspace owner id resolvable from `auth.uid()`, not client input.
- Or introduce a `workspace_id` column on `staff` and switch policies to it, matching the pattern used by other tables.
- Audit every INSERT path in the app that touches `staff` to confirm `created_by` is derived server-side.

**Priority:** **P0** — this is the top security fix.

### 2. `custom_fields` — policies apply to `public` role ⚠️ **Medium (defense-in-depth)**

**Finding:** `custom_fields` policies grant to `public` rather than `authenticated`. `auth.uid()` returns NULL for unauthenticated requests, so the policy still fails — but relying on function-null semantics for security is fragile.

**Evidence:** Persisted scanner internal_id `custom_fields_public_role_broad_access`.

**Remediation:** Recreate the policies with `TO authenticated` (or `TO authenticated, service_role` where appropriate).

**Priority:** **P1**.

### 3. `workspace_members` — role escalation review — **Informational**

Scanner downgraded to informational after re-evaluation. Only the literal workspace owner (`auth.uid() = workspace_owner_id`) can mutate memberships, so a workspace_admin member cannot escalate. **No action.** Keep the invariant when future changes touch these policies.

---

## Structural security gaps (not scanner-flagged)

### A. Audit log tamper resistance — **High**

Every audit table (`audit_logs`, `security_events`, `permission_audit_logs`, …) is a normal Postgres table. Service_role can rewrite history. There is no hash chain, no append-only enforcement, no external write-once destination.

**Remediation options** (pick one per audit stream):

1. Per-row hash chain: `hash = sha256(prev_hash || row_bytes)` computed in a `BEFORE INSERT` trigger; `prev_hash` fetched from the last row for the same workspace. Periodically snapshot the chain head to an external log sink.
2. Duplicate every critical event to an append-only edge-function sink (S3 Object Lock / Cloudflare Logpush) with WORM semantics.
3. For NIST AU-9 alignment, both are recommended.

**Priority:** **P0** for any enterprise / regulated pursuit; **P1** otherwise.

### B. No customer-facing audit export — **Medium**

Audit tables exist but no export path. Enterprise security teams expect SIEM ingestion (Splunk / Sentinel / Chronicle).

**Remediation:** Add a scheduled edge function that pushes newline-delimited JSON per workspace to a customer-configured S3 bucket or webhook, signed and rate-limited.

**Priority:** **P1**.

### C. CORS allowlist across edge functions — **Medium**

`supabase/functions/_shared/cors.ts` exists but must be audited per function to ensure it does not fall back to `Access-Control-Allow-Origin: *` for authenticated endpoints. The `verify_jwt` posture per function should also be re-checked in `supabase/config.toml`.

**Priority:** **P1**.

### D. Account lockout after repeated failed logins — **Medium**

`rate_limits` table + auth-hardening memory reference route-level limits, but there is no explicit persistent lockout counter with an admin-visible unlock. Regulators expect a documented lockout policy (attempts, cooldown, unlock path).

**Priority:** **P1**.

### E. Secrets rotation cadence not documented — **Medium**

Lovable API key, Supabase JWT signing keys, Stripe API keys, Resend key — no published rotation cadence, no rotation runbook. `secrets_audit_log` captures changes but no schedule.

**Priority:** **P1**.

### F. No `security.txt` + no coordinated vulnerability disclosure — **Low**

Serve `public/.well-known/security.txt` with contact + disclosure policy. Publish `docs/security/vulnerability-disclosure.md`.

**Priority:** **P1**.

### G. Client-side token storage in localStorage — **Medium (accepted)**

`src/integrations/supabase/client.ts` documents this and the migration plan (`docs/security/http-only-cookie-session-migration.md`). XSS surface is mitigated by CSP + React default escaping. Track in security memory as **accepted risk** until an HttpOnly cookie proxy is deployed.

**Priority:** **P2** (migration is a bigger architectural change; keep the mitigation active).

### H. No SBOM produced at build — **Medium (for enterprise)**

Modern enterprise procurement asks for CycloneDX or SPDX per release. Add a build step (Syft or `cyclonedx-bom`) and publish `sbom.cdx.json` per deploy.

**Priority:** **P1**.

### I. No signed release artifacts — **Low (until on-prem)**

Not blocking today for SaaS. Becomes **P0** for on-prem update packages (see `12-onprem-installer-blueprint.md`).

### J. `frame-src 'self'` — verify Stripe Checkout works — **Low**

`public/_headers` CSP has `frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://*.stripe.com https://challenges.cloudflare.com` — this is correct. Confirm during a live checkout drill.

### K. Storage bucket policies — **Medium**

Prior security sprint tightened `warehouse_twin_objects` and storage bucket permissions. Re-check each named bucket (avatars, imports, exports, snapshots) for:
- workspace-scoped `folder = workspace_id::text` conventions,
- signed URL expiry defaults,
- deny public reads unless intentional.

**Priority:** **P1**.

### L. No continuous secret scanning in CI — **Low**

Add gitleaks or trufflehog on push events; the repo already avoids service_role in client — keep it that way.

**Priority:** **P2**.

## Verified-OK today

- **HIBP** password check enabled.
- **CSP** does not allow `unsafe-eval` in prod; only `unsafe-inline` (required by React inline hydration). Ok for enterprise as long as documented.
- **HSTS** with `max-age=31536000; includeSubDomains`.
- **X-Frame-Options: SAMEORIGIN** and CSP `frame-ancestors 'self'`.
- **Cross-Origin-Opener-Policy: same-origin-allow-popups** — correct for OAuth popups.
- **No service_role usage in the browser bundle** — only anon key is exposed.
- **No `dangerouslySetInnerHTML`** applied to user-provided data (per prior audits documented in `src/integrations/supabase/client.ts` comments).
- **Dependency scan clean** (no high / critical).
