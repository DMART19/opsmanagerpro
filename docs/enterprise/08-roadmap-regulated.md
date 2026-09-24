# 08 — Regulated Industry Roadmap

Covers healthcare warehousing (HIPAA-conditional), life sciences, and other regulated warehousing (cold chain, controlled substances, defense material). No HIPAA-shaped feature is built until a customer contract requires it.

## Gate: is PHI actually in scope?

Answer these first. If any answer is "yes," HIPAA applies to that workspace.

1. Will pallets or shipments carry patient-identifiable items (patient specimens, labeled prescriptions, home-delivery Rx with recipient PII)?
2. Will any credential, certification, or employee record store health information (drug tests, medical clearance, injury reports)?
3. Will exports contain identifiers of patients / recipients?

Today: OpsManagerPro does not intentionally handle PHI. Warehousing employee credentials (§`certifications`) could accidentally accrue medical info. Add editorial guidance ("Do not upload medical records") until a PHI mode is designed.

## Milestones (only if PHI is required)

### R1 — "BAA-ready workspace mode" (Q2 of a regulated pipeline)

- **[P0]** Add `workspace_settings.phi_mode boolean`. When on:
  - Force MFA for all members.
  - Force session timeout at `REGULATED_MODE_ENABLED` values.
  - Force step-up on any export.
  - Require all audit events to a WORM sink.
  - Disallow AI features that could send data to Lovable AI Gateway unless the gateway has a BAA (Anthropic BAA covers many models — verify).
- **[P0]** Require upstream BAAs: Supabase (available on higher plans), Resend (Business+), Lovable AI (verify per model).
- **[P0]** Written Business Associate Agreement template offered to customers.
- **[P0]** Risk analysis document (`docs/security/hipaa-risk-analysis.md`).
- **[P0]** IR plan with 60-day breach notification pathway.
- **[P1]** Workforce sanction policy + training log.

### R2 — "PHI classification + DLP" (Q3 of a regulated pipeline)

- **[P1]** Use `data_classifications` to tag columns that may contain PHI.
- **[P1]** DLP rules: block export of PHI-tagged columns without step-up.
- **[P1]** Encryption-at-rest attestation letter from Supabase attached to security addendum.
- **[P1]** Configurable retention per data class (already scaffolded in `data_governance_policies`).

### R3 — "Regulated cold-chain / controlled substance" (as needed)

- **[P2]** Chain-of-custody augmentation for shipments (immutable trail).
- **[P2]** Two-person integrity (dual sign-off) for controlled-substance events.
- **[P2]** Temperature / condition event ingestion (out of current product scope).
- **[P2]** Alignment with 21 CFR Part 11 electronic-signature requirements (life sciences).

## What NOT to build (per user directive)

- Do **not** ship generic HIPAA features (patient portals, clinical fields, EHR integrations).
- Do **not** call OpsManagerPro "HIPAA compliant" without a BAA and evidence.
- Do **not** enable AI features on PHI workspaces without a written BAA covering the model provider.
- Do **not** conflate "PHI mode" with "regulated mode." Regulated mode already exists as a global switch; PHI mode is per workspace.

## Contractual posture

- Publish a public **BAA template** but do not auto-sign it. Enterprise BAA closure is a manual legal step.
- Publish an **HIPAA Statement of Applicability** page listing exactly which safeguards OpsManagerPro implements vs relies on subprocessors for.

## Verifiable evidence a regulator / auditor will ask for

- Signed BAAs with each subprocessor.
- Risk analysis (annual, dated).
- Workforce security training completion log.
- Audit log tamper-evidence + retention (min 6 years for HIPAA-covered entities).
- Encryption-in-transit + at-rest attestation.
- Contingency plan + last DR drill evidence.
- Documented sanction policy applied consistently.
