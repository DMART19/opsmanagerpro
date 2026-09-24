# 10 — Prioritized Implementation Plan

Every recommendation in the audit consolidated and tagged. Effort labels: **XS** (<1d), **S** (1–3d), **M** (1–2w), **L** (2–4w), **XL** (>4w).

## P0 — Critical (do now)

Blocking enterprise deals or creating material security/legal risk.

| ID | Item | Effort | Category | Notes |
|----|------|--------|----------|-------|
| P0-1 | Fix `staff` policies — add WITH CHECK tying `created_by` to effective workspace owner from `auth.uid()` | S | Security | Scanner finding, PII exposure |
| P0-2 | Restrict `custom_fields` policies to role `authenticated` (not `public`) | XS | Security | Scanner finding, defense-in-depth |
| P0-3 | Tamper-evident audit trigger (hash chain) on `audit_logs`, `security_events`, `permission_audit_logs`, `data_access_logs`, `snapshot_audit_logs` | M | Security | NIST AU-9 alignment |
| P0-4 | Publish MSA, DPA, SLA, Security Addendum, Subprocessor list as `/legal/*` + PDF | M | Legal | Blocks every F500 deal |
| P0-5 | Publish RTO / RPO (proposed: RTO 4h, RPO 1h) + run 1 documented restore drill | M | DR | Blocks every RFP |
| P0-6 | Ship SAML 2.0 SSO on Enterprise tier via `supabase--configure_saml_sso` | M | Identity | Single biggest F500 blocker |
| P0-7 | Publish `security.txt` + Vulnerability Disclosure Policy | XS | Security | Table stakes |
| P0-8 | Publish `/changelog` + release notes cadence | S | Ops | Change management |
| P0-9 | Documented Incident Response plan (`docs/security/incident-response.md`) | S | Ops | Required by every framework |
| P0-10 | External uptime monitoring against auth + representative authed API | XS | Ops | Evidence for SLA |
| P0-11 | Offboarding SLA (export + destruction + certificate of destruction) | S | Legal / Ops | GDPR Art. 17 |

## P1 — High Priority (next 90 days)

Required for Fortune 500 procurement and regulated readiness.

| ID | Item | Effort | Category | Notes |
|----|------|--------|----------|-------|
| P1-1 | SCIM 2.0 provisioning endpoint | L | Identity | Followup to SAML |
| P1-2 | JIT provisioning on SAML login | S | Identity | |
| P1-3 | Customer-facing audit-log export API (scheduled push to S3 / webhook) | M | Security | SIEM integration |
| P1-4 | CycloneDX SBOM per release, published as artifact | S | Security / Gov | EO 14028 |
| P1-5 | Signed release artifacts (SLSA ≥ 2) | M | Security / Gov | |
| P1-6 | Continuous vulnerability scanning in CI (Dependabot / Snyk / OSV) + POA&M tracker | S | Security | |
| P1-7 | Documented secrets rotation cadence + runbook | S | Security | |
| P1-8 | Account lockout policy: N failed logins → cooldown, admin unlock path | S | Security | |
| P1-9 | Wire hosted ticketing (Freshdesk / Zendesk / Plain) to `support_messages` | S | Support | |
| P1-10 | Public status page (Better Stack / Statuspage) | XS | Ops | |
| P1-11 | Formal admin guide + backup/DR runbook + architecture doc | M | Docs | |
| P1-12 | CORS allowlist audit per edge function; audit `verify_jwt` posture | S | Security | |
| P1-13 | Storage bucket policy re-audit (workspace folders, signed URL expiry, public read) | S | Security | |
| P1-14 | Introduce `src/config/deployment.ts` + `_shared/deployment.ts` env-driven config | S | Arch | Foundation for other modes |
| P1-15 | Custom-role builder (per-workspace) | L | Authz | F500 ask |
| P1-16 | Facility-scoped permissions (opt-in feature flag) | M | Authz | |
| P1-17 | Vendor / subprocessor management doc | XS | Legal | |
| P1-18 | Quarterly DR drill cadence + annual pen-test cadence | S | Ops | |
| P1-19 | Annual security training program for engineering + support | S | Ops | |
| P1-20 | NIST 800-53 Moderate mapping doc | M | Compliance | Gov-adjacent + SOC 2 asset |
| P1-21 | Secure SDLC doc aligned to NIST SP 800-218 (SSDF) | S | Compliance | |
| P1-22 | Data classification + retention publication (public policy) | S | Compliance | GDPR / CCPA |

## P2 — Medium Priority (next 6–12 months)

Required for SOC 2, regulated pipelines, and BYOC customers.

| ID | Item | Effort | Category | Notes |
|----|------|--------|----------|-------|
| P2-1 | Adopt Drata / Vanta / Secureframe; wire evidence collection | M | Compliance | |
| P2-2 | Full policy set (InfoSec, Access, Change, IR, Vendor, BCDR, Crypto, SDLC) | L | Compliance | |
| P2-3 | SOC 2 Type I attestation | XL (external) | Compliance | 3–6 mo |
| P2-4 | SOC 2 Type II observation + attestation | XL (external) | Compliance | +6 mo |
| P2-5 | Private Cloud (single-tenant) offering GA | L | Deployment | |
| P2-6 | Data residency selector (EU / US regional Supabase projects) | L | Deployment | |
| P2-7 | Storage adapter interface + S3 adapter | L | Arch | Prep for on-prem |
| P2-8 | Migrate token storage to HttpOnly-cookie proxy | XL | Security | |
| P2-9 | Named CSM motion + QBR template + PS SOW template | M | Sales / Ops | |
| P2-10 | Customer-managed encryption keys (CMEK) via Supabase KMS | M | Security | Regulated ask |
| P2-11 | DLP rules on `data_classifications` (block export of PHI-tagged w/o step-up) | M | Security | Conditional |
| P2-12 | PHI-mode workspace flag (behind BAA) | M | Security | Only if PHI |
| P2-13 | Continuous secret scanning in CI (gitleaks) | XS | Security | |
| P2-14 | APM / RUM for user experience | S | Ops | |
| P2-15 | Alert bridge to PagerDuty / Opsgenie | S | Ops | |

## P3 — Future / conditional

Only if triggered by a specific deal.

| ID | Item | Effort | Category | Notes |
|----|------|--------|----------|-------|
| P3-1 | FedRAMP Moderate SSP + 3PAO engagement | XXL | Gov | 12–18 mo |
| P3-2 | FIPS 140-2/3 crypto boundary end-to-end | XL | Gov | Requires FIPS module |
| P3-3 | GovCloud (single-tenant) deployment channel | XL | Gov / Deployment | |
| P3-4 | On-Prem installer (Docker Compose reference stack, signed update packages, offline license) | XXL | Deployment | See §12 |
| P3-5 | Air-gapped update tooling (`omp-update` CLI, offline package repository) | XL | Deployment | |
| P3-6 | LDAP / Active Directory bind for Windows shops | L | Identity | On-prem trigger |
| P3-7 | 21 CFR Part 11 electronic-signature support | L | Compliance | Life-sci trigger |
| P3-8 | IL4/IL5 deployment via partner | XXL | Gov | Only via partner |

## Sequencing note

P0 items are the natural first sprint. Most are docs + one migration + one edge-function enable — call it a **P0 Enterprise Readiness Sprint** and it fits inside two weeks.
