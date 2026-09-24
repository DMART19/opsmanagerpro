# 06 — Recommended Architecture

Target end-state architecture supporting four deployment modes with a single codebase.

## Guiding principles

1. **One codebase, four deployment shapes.** Do not fork.
2. **Environment provides the backend.** Every backend URL, key, feature switch is env-driven, never hardcoded.
3. **Licensing is separate from data.** A revoked license degrades to read-only; customer data is never deleted by the license system.
4. **Auditable by default.** Every write path emits an audit event; audit is tamper-evident.
5. **No vendor lock beyond what the customer accepts.** SaaS locks to Supabase + Stripe + Lovable AI; on-prem must degrade gracefully without them.

## Deployment modes

```text
                 ┌────────────────────────────────────────────────┐
                 │              OpsManagerPro Codebase            │
                 │  (Vite SPA + Deno edge functions + Postgres)   │
                 └───────┬──────────────┬────────────┬────────────┘
                         │              │            │
   ┌─────────────────────┼────┐   ┌─────┼───────┐  ┌─┼──────────────┐
   │        SaaS         │    │   │ Private │   │  │  On-Prem       │
   │  (multi-tenant)     │    │   │  Cloud  │   │  │  / Air-Gapped  │
   │                     │    │   │         │   │  │                │
   │ Supabase (managed)  │    │   │Single-  │   │  │Docker Compose  │
   │ Stripe (billing)    │    │   │tenant   │   │  │Bundled Postgres│
   │ Lovable AI Gateway  │    │   │Supabase │   │  │Local MinIO / S3│
   │ Resend (mail)       │    │   │ or      │   │  │Local mail relay│
   │ Cloudflare (CDN)    │    │   │self-host│   │  │License file    │
   │ Managed backups+PITR│    │   │Postgres │   │  │Manual updates  │
   │                     │    │   │+Storage │   │  │Signed packages │
   └─────────────────────┘    │   └─────────┘   │  └────────────────┘
                              │                 │
                    Dedicated Cloud       Customer VPC / Gov Cloud
                    (isolated project)   (BYOC — customer-owned)
```

## Layered architecture

```text
┌──────────────────────────────────────────────────────────────┐
│  Presentation      Vite/React SPA · Tailwind · shadcn        │
├──────────────────────────────────────────────────────────────┤
│  Client integrations                                          │
│  - supabase-js (auth + Data API)                              │
│  - Stripe.js (SaaS only)                                      │
│  - fetch → edge functions                                     │
├──────────────────────────────────────────────────────────────┤
│  Edge functions (Deno)                                        │
│  - auth-email-hook, stripe-webhook, validate-workspace,       │
│    load-plan-chat, generate-warehouse, process-*, seed-*      │
│  - All read license via _shared/entitlements.ts               │
│  - All write audit events via _shared/audit.ts (new)          │
├──────────────────────────────────────────────────────────────┤
│  Data plane (Postgres 15+)                                    │
│  - RLS on every user-facing table                             │
│  - Security-definer functions for authorization               │
│  - Tamper-evident audit tables (hash chain)                   │
│  - Storage buckets (Supabase / MinIO / S3 / Azure Blob)       │
├──────────────────────────────────────────────────────────────┤
│  Platform services                                            │
│  - Identity: Supabase Auth (SaaS) / SAML SSO (enterprise) /   │
│    OIDC (BYOC) / Local (on-prem)                              │
│  - Licensing: Stripe (SaaS) / License file (on-prem)          │
│  - Mail: Resend (SaaS) / SMTP relay (on-prem)                 │
│  - AI: Lovable AI Gateway (SaaS) / disabled or self-hosted    │
│    (on-prem/air-gapped)                                       │
└──────────────────────────────────────────────────────────────┘
```

## Configuration surface (introduce)

Single canonical config module read once at boot (`src/config/deployment.ts`, edge equivalent `_shared/deployment.ts`):

```text
DEPLOYMENT_MODE       saas | private_cloud | on_prem | air_gapped
LICENSE_MODE          stripe | license_file
AUTH_PROVIDERS        [local, google, saml, oidc]
STORAGE_BACKEND       supabase | s3 | minio | azure | local_fs
MAIL_BACKEND          resend | smtp | disabled
AI_BACKEND            lovable_ai | disabled | self_hosted
AUDIT_SINK            db_only | db+s3_worm | db+webhook
UPDATE_CHANNEL        continuous | manual_signed
```

Every integration reads from here. **No feature branches.**

## Identity architecture

- **SaaS**: Supabase Auth (email/password + Google), MFA via TOTP.
- **Enterprise tier (SaaS)**: add SAML 2.0 SSO per workspace via Supabase native SAML. SCIM 2.0 provisioning endpoint implemented as an edge function.
- **Private Cloud**: same as Enterprise; single-tenant Supabase project.
- **On-Prem**: local auth service + SAML/OIDC bridge. TOTP MFA. Optional LDAP/AD bind for Windows shops.
- **Air-Gapped**: local auth only; TOTP MFA mandatory for admins.

## Authorization architecture

- Keep `user_roles` (system role) + `workspace_members.role` (workspace tier role).
- Add `custom_roles` (workspace-defined role → permission bitmap) as an optional enterprise feature.
- Add optional `facility_scopes` join table: `(user_id, workspace_id, warehouse_id, role_id, expires_at)` for warehouse-scoped and time-boxed elevation.

## Storage architecture

Storage adapter interface (`src/lib/storage/adapter.ts`, edge equivalent):

```text
put(bucket, key, blob, opts)     -> {url}
get(bucket, key)                 -> stream
sign(bucket, key, expiry)        -> presigned url
delete(bucket, key)              -> void
```

Adapters: Supabase Storage (default), S3 (BYO bucket), MinIO (on-prem), Azure Blob, Local FS (on-prem tiny installs).

## Audit architecture

- Every write goes through `_shared/audit.ts::record(event)`.
- `record` computes `prev_hash` from the last row for `(workspace_id, stream)`, writes new row with `hash = sha256(prev_hash || canonical(event))`.
- Optional secondary sink: forward to WORM S3 (SaaS Enterprise) or local WORM directory (on-prem).
- Nightly job re-verifies the chain and writes result to `recovery_checks`.

## Backup architecture

- **SaaS**: Supabase automatic + PITR; customer-triggered workspace snapshots via `create-scheduled-snapshots`. Optional customer S3 export per workspace.
- **Private Cloud**: same, single-tenant.
- **On-Prem**: `pg_basebackup` + WAL archiving to customer-provided path; storage adapter also copies file blobs. Signed backup archive with GPG.
- **Air-Gapped**: same as on-prem, no offsite.

## Update architecture

- **SaaS / Private Cloud**: continuous deploy via Lovable publish.
- **On-Prem**: signed update package `.omp` (see §12). Update tool: `omp-update apply pkg-v1.2.3.omp`. Rollback: `omp-update rollback`.

## Licensing architecture

- **SaaS**: license is a materialized view of `workspace_plans` state driven by Stripe webhook. No customer-side artifact.
- **On-Prem / Air-Gapped**: signed license JSON:
  ```
  { workspace_id, customer_name, plan_tier, seats, facilities,
    features:[...], issued_at, expires_at, grace_days,
    signature (Ed25519) }
  ```
  Verified at app boot with a public key baked into the release. Grace period behavior: read-only after expiry+grace; **never deletes data**.

## Recommended near-term deltas (achievable inside current SaaS)

1. Introduce `src/config/deployment.ts` + `_shared/deployment.ts` NOW even though only `saas` is live — it removes future friction.
2. Add tamper-evident audit trigger for the top-5 audit tables (`audit_logs`, `security_events`, `permission_audit_logs`, `data_access_logs`, `snapshot_audit_logs`).
3. Ship SAML 2.0 SSO for the Enterprise plan tier.
4. Ship a `sbom.cdx.json` build step.
5. Publish `docs/enterprise/` (this pack) externally as the trust center.
