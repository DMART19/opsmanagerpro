# 11 — Licensing Architecture

Future licensing model that spans SaaS, Private Cloud, On-Prem, and Air-Gapped. Licensing is treated as **separate from customer data**: revoking a license degrades to read-only, it never deletes data.

## Principles

1. **Data ≠ License.** Customer data is customer property, always. License controls access + feature set only.
2. **Grace by default.** Every mode allows a grace window (default 30 days) before locking write access.
3. **Read-only fallback, never destructive.** After grace: read-only, not delete, not silent uninstall.
4. **Offline-capable.** On-prem and air-gapped modes must not depend on any Lovable-side call to remain licensed.
5. **Cryptographically verifiable.** License files are Ed25519-signed with a public key baked into every release.
6. **Feature flags are license-driven.** No client-only feature toggles for paid features.

## Deployment × licensing matrix

| Deployment | Source of truth | Activation | Grace | Renewal |
|---|---|---|---|---|
| SaaS | Stripe webhook → `workspace_plans` | Automatic (checkout) | Follows Stripe `past_due` state | Automatic (Stripe) |
| Private Cloud | Stripe or signed license file | Online or file upload | 30 days | Automatic or manual |
| On-Prem | Signed license file | Manual (upload / CLI) | 30 days | Manual signed file |
| Air-Gapped | Signed license file, sneakernet | Manual (CLI) | 60 days | Manual signed file |

## License file format (`omp-license.json`)

```json
{
  "license_id": "omp_lic_2027_00042",
  "issued_to": {
    "customer_name": "Acme Warehousing, Inc.",
    "contact_email": "it@acme.example",
    "workspace_id": "5f2c…"
  },
  "product": "OpsManagerPro",
  "edition": "enterprise",
  "plan_tier": "ops_pro",
  "issued_at": "2027-01-15T00:00:00Z",
  "not_before": "2027-01-15T00:00:00Z",
  "expires_at": "2028-01-15T00:00:00Z",
  "grace_days": 30,

  "limits": {
    "seats": 250,
    "facilities": 10,
    "workspaces": 1,
    "api_requests_per_month": 5000000
  },

  "features": [
    "load_planner",
    "warehouse_twin",
    "excel_import",
    "ai_load_plan",
    "advanced_reports",
    "saml_sso",
    "scim",
    "audit_export"
  ],

  "signature_alg": "Ed25519",
  "signature": "BASE64_SIG_OF_THE_ABOVE_CANONICALIZED",
  "signing_key_id": "omp-signing-2027-01"
}
```

### Verification

- Ed25519 public keys baked into the app at build time; keyed by `signing_key_id` to allow rotation.
- Canonicalization: JCS (RFC 8785) or a defined canonical JSON — implementation must match issuer.
- Verification performed:
  - at process start (edge / server / desktop app),
  - on the first authenticated request per session (client),
  - in a daily job that re-verifies and writes `license_checks` audit rows.

### Grace behavior

```
if now < expires_at:            NORMAL
if expires_at <= now < expires_at + grace_days:  GRACE (banner + admin nag)
if now >= expires_at + grace_days:               READ_ONLY (blocks writes,
                                                             preserves data,
                                                             allows export)
```

`READ_ONLY` never deletes customer data. Re-activation with a valid license restores writes.

## Enforcement layers

1. **Feature check at UI**: `useFeatureAccess(feature)` returns `false` for missing features (already scaffolded).
2. **Server enforcement at edge fn**: `_shared/entitlements.ts::requireFeature(ctx, "feature")` (already exists — reuse for licensed features).
3. **DB enforcement at RLS**: for critical caps (seat count, facility count), use a security-definer function `license_within_limits(workspace_id, resource)` in RLS `WITH CHECK`.
4. **License-check middleware** on all edge functions that respect grace/read-only state.

## SaaS-specific: keep Stripe as source of truth

- `stripe-webhook` continues to update `workspace_plans`.
- Introduce a `license_snapshots` table: on every plan change, write a snapshot including plan tier, features array, seats, effective dates. Enables historical audit ("what features did this workspace have on date X?").

## On-Prem / Air-Gapped licensing tools

- **`omp-license verify <file>`** — verify signature + print effective grants.
- **`omp-license apply <file>`** — install license into the local instance.
- **`omp-license status`** — show current state, expiry, grace remaining.
- **`omp-license export`** — dump current license + usage metrics (for renewal negotiation).

## Trust boundaries

| Actor | Can | Cannot |
|---|---|---|
| Customer admin | Apply new license file, view current license, export current license | Modify or forge a license |
| OpsManagerPro Ops | Issue, revoke, extend license | Access customer data (unless separately authorized) |
| License compromise (leaked file) | Signature valid, but expires eventually | Deleted data cannot be recovered because data is not tied to license |

## Anti-abuse

- **Node fingerprint (soft)** for on-prem: bind license to a stable instance fingerprint (workspace_id + install_id). Mismatch produces a warning banner + audit event, not an outage.
- **Usage telemetry (opt-in)** for on-prem: signed monthly usage report emitted, customer can upload manually or email in for renewal true-up.
- Do not enforce hardware locks / dongles — enterprise customers hate them.

## Migration path from today

1. Introduce `license_snapshots` table (SaaS-only initially).
2. Refactor entitlement checks to read from `license_snapshots` view instead of `workspace_plans` directly.
3. Add Ed25519 verification path behind a `LICENSE_MODE=license_file` env flag (not enabled in SaaS).
4. Build the `omp-license` CLI + management portal (`OpsManagerPro Enterprise`) later, only when on-prem is greenlit.

This lets us start emitting audit-ready license history now without disrupting the SaaS billing pipeline.
