# 00 — Executive Summary

## Overall Enterprise Readiness Score

**52 / 100 — "Mid-market SaaS, not yet enterprise-ready."**

OpsManagerPro is a well-architected multi-tenant SaaS that is materially
ahead of typical Lovable-generated apps on security fundamentals: it has
RLS on every user-facing table, workspace-scoped isolation, a working RBAC
model, MFA scaffolding, session timeouts, step-up auth, audit logging,
CSP + security response headers, rate limiting, and Stripe-driven
entitlements. That is enough to sell to SMB and lower mid-market customers
with credibility.

It is **not yet ready** for Fortune 500 procurement, federal contractors,
regulated healthcare warehousing, or any deployment model outside SaaS.
The gaps that block those deals are structural, not cosmetic:

1. **No enterprise identity story.** No SAML, no OIDC federation with
   customer IdPs, no SCIM provisioning, no Entra ID / Okta support. Local
   accounts + Google OAuth only. This alone disqualifies most F500 RFPs.
2. **No signed, exportable audit log.** Audit tables exist but there is no
   tamper-evidence (hash chain / WORM), no SIEM export, no long-term
   retention policy that a compliance officer can point at.
3. **No formal legal / contractual pack.** In-app Privacy, ToS, Security,
   Cookie, and AUP pages exist, but there is no MSA, DPA, SLA, BAA-ready
   template, subprocessor list, or security addendum. Procurement will
   ask for these on day one.
4. **No customer-facing DR commitment.** Backup infrastructure exists
   (`backup_records`, `workspace_snapshots`, `create-scheduled-snapshots`)
   but there is no documented RTO / RPO, no restore drill evidence, no
   PITR window disclosed to customers.
5. **No deployment story outside SaaS.** The product is a Vite SPA bound
   to a single managed Supabase backend, Stripe, and the Lovable AI
   Gateway. Nothing supports customer-owned cloud, on-prem, or air-gapped
   deployment today. This is the largest single gap for federal / regulated
   pursuit.
6. **No enterprise licensing model.** Entitlements are Stripe-plan-driven
   only. There is no license file, no offline activation, no grace period,
   no feature-flag license, no user / facility cap enforcement outside the
   SaaS DB.
7. **No SBOM, supply chain attestation, or FIPS story.** Dependency scan
   is clean today, but there is no continuous SBOM (CycloneDX / SPDX), no
   signed release artifacts, and no FIPS-validated crypto boundary.

## Existing Strengths (high level)

- Strict workspace-scoped RLS with security-definer functions
  (`has_role`, `has_workspace_permission`).
- Roles stored in a dedicated `user_roles` table — no role-on-profile
  privilege-escalation antipattern.
- Centralized security config (`src/config/security.ts`) — MFA gates,
  idle + absolute session timeouts, step-up auth, password policy,
  HIBP protection.
- Real HTTP security headers in `public/_headers` (CSP, HSTS, XFO,
  Permissions-Policy, Referrer-Policy).
- Rate limiting at both DB (`rate_limits` table) and edge-function
  layers (`supabase/functions/_shared/rate-limit.ts`).
- Multiple dedicated audit tables:
  `audit_logs`, `security_events`, `permission_audit_logs`,
  `data_access_logs`, `secrets_audit_log`, `snapshot_audit_logs`.
- Data-governance scaffolding: `data_classifications`,
  `data_governance_policies`, `data_lineage`, `deletion_requests`.
- Backup + DR scaffolding: `backup_config`, `backup_records`,
  `workspace_snapshots`, `recovery_checks`, `enforce-retention`,
  `create-scheduled-snapshots`.
- Server-side entitlement checks in gated edge functions
  (`load-plan-chat`, `generate-warehouse`).
- Client-side data masking + log sanitization
  (`src/lib/data-security.ts`).

## Go / No-Go by Segment

| Segment | Verdict | Blocker |
|---|---|---|
| SMB / mid-market SaaS | **GO** | Ready to sell today |
| Fortune 500 commercial | **NO-GO** | No SAML / SCIM, no MSA/DPA/SLA pack, no signed audit export |
| Regulated (HIPAA-conditional) | **NO-GO** | No BAA-ready posture, no PHI classification, no encryption-at-rest attestation surfaced to customer |
| Federal contractors | **NO-GO** | No FedRAMP planning, no FIPS boundary, no SBOM, no ATO artifacts |
| Air-Gapped / On-Prem | **NO-GO** | Product is SaaS-only; installer, offline license, and vendored deps do not exist |

## Top 10 Actions (details in [10-prioritized-plan.md](./10-prioritized-plan.md))

1. **P0** — Publish MSA, DPA, SLA, Security Addendum, Subprocessor list.
2. **P0** — Document + publish RTO / RPO and run a restore drill; record evidence.
3. **P0** — Ship SAML 2.0 SSO for enterprise tier (Supabase `configure_saml_sso` supported).
4. **P0** — Add tamper-evident audit log (hash-chain per workspace) and CSV/JSON export.
5. **P0** — Enforce workspace-scoped WITH CHECK on `staff` inserts (see scanner finding).
6. **P1** — SCIM 2.0 provisioning endpoint (edge function) + JIT SAML provisioning.
7. **P1** — Continuous SBOM (CycloneDX) generated at build; publish per release.
8. **P1** — Security.txt, coordinated vulnerability disclosure, and incident-response runbook.
9. **P2** — Private-cloud deployment blueprint (single-tenant Supabase + isolated storage).
10. **P3** — On-prem Enterprise Installer (Docker Compose reference stack + signed update packages + offline license activation).

See the category-by-category audit for evidence and the roadmap files for
segment-specific sequencing.