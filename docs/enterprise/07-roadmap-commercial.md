# 07 — Commercial Enterprise Roadmap

Path to Fortune 500 procurement-ready. Sequenced in 90-day increments.

## Q1 (Days 0–90) — "Trust center + SAML"

**Outcome:** win a first Fortune 500 pilot.

- **[P0]** Publish MSA, DPA, SLA, Security Addendum, Subprocessor list at `/legal/*` and downloadable PDF.
- **[P0]** Publish RTO / RPO (proposed: **RTO 4 h, RPO 1 h**). Run one restore drill; store evidence in `docs/enterprise/dr-drills/`.
- **[P0]** Ship SAML 2.0 SSO for the Enterprise plan tier via `supabase--configure_saml_sso`. Support Okta, Entra ID, Ping.
- **[P0]** Fix scanner findings in `staff` (workspace-scope WITH CHECK) and `custom_fields` (restrict to `authenticated`).
- **[P0]** Ship tamper-evident audit trigger on top-5 audit tables.
- **[P1]** `security.txt` + Vulnerability Disclosure Policy.
- **[P1]** Publish `/status` (Better Stack or Statuspage).
- **[P1]** Publish `/changelog` (release notes cadence).
- **[P1]** Formal incident-response plan (`docs/security/incident-response.md`).
- **[P1]** Wire external uptime monitoring against auth + representative authed API path.

## Q2 (Days 91–180) — "Enterprise identity + auditability"

**Outcome:** clear procurement security reviews without exceptions.

- **[P1]** SCIM 2.0 provisioning endpoint (edge function). Support user create/update/deactivate.
- **[P1]** JIT provisioning on SAML login.
- **[P1]** Continuous SBOM (CycloneDX) attached to every publish.
- **[P1]** Customer-facing audit-log export API (scheduled push to customer S3 or webhook).
- **[P1]** Continuous vulnerability scanning + POA&M tracker (`security_findings` table already scaffolded via scanner service).
- **[P1]** Secrets rotation cadence + runbook.
- **[P1]** Wire hosted ticketing (Freshdesk / Zendesk / Plain) to `support_messages`.
- **[P2]** Custom-role builder (per-workspace).
- **[P2]** Facility-scoped permissions (opt-in feature flag).
- **[P2]** Data residency selector at workspace create time (EU / US / …), backed by regional Supabase projects.

## Q3 (Days 181–270) — "SOC 2 Type I + regulated readiness"

**Outcome:** SOC 2 Type I attestation.

- **[P1]** Adopt Drata / Vanta / Secureframe. Wire evidence collection to audit tables.
- **[P1]** Write policy set: InfoSec, Access Control, Change Management, Incident Response, Vendor Management, BCDR, Cryptography, Secure SDLC.
- **[P1]** Annual pen-test engagement.
- **[P1]** Quarterly DR drill cadence.
- **[P1]** Annual security awareness training for engineering + support.
- **[P2]** Named CSM motion + QBR template for enterprise accounts.
- **[P2]** Professional services SOW template (implementation + import + training).

## Q4 (Days 271–365) — "SOC 2 Type II observation + expansion"

**Outcome:** Type II observation window running; expand into regulated pipeline.

- **[P1]** 6-month Type II observation window running (evidence collection continuous).
- **[P1]** Private Cloud (single-tenant) offering GA'd for regulated customers.
- **[P2]** Data-loss-prevention rules using `data_classifications` (PHI / PII / Confidential).
- **[P2]** Customer-managed encryption keys (CMEK) via Supabase KMS.
- **[P3]** Begin FedRAMP or StateRAMP planning if a specific pipeline exists.

## Deals-blocked-by-what matrix

| Enterprise ask | Blocked until | Roadmap slot |
|---|---|---|
| SAML SSO | Q1 SAML ship | Q1 |
| DPA / MSA / SLA signed | Q1 legal pack | Q1 |
| SOC 2 report | Q4 Type II attestation issued | Q4+ |
| Audit log SIEM export | Q2 export API | Q2 |
| SCIM auto-provisioning | Q2 SCIM endpoint | Q2 |
| BAA (HIPAA) | Regulated roadmap (see 08) | External |
| Air-gapped install | On-prem installer (see 12) | 12–18 mo |

## Team & investment shape (informational)

- 1 security engineer (part-time, existing) to own audit / RLS / IR plan.
- 1 solutions engineer to own SAML/SCIM onboarding docs and identity edge cases.
- 1 technical writer (fractional) to own trust center + admin guide.
- 1 auditor engagement + 1 pen-test firm engagement.
