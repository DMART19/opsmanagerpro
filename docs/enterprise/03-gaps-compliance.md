# 03 — Compliance Gaps

Compliance is a **contract-plus-evidence** discipline, not a code-only one. Below is what's missing to survive procurement + regulator scrutiny in each relevant frame.

## Cross-cutting gaps (apply to every framework)

| Gap | Impact | Priority |
|---|---|---|
| No published SLA / uptime commitment | Blocks every enterprise MSA | **P0** |
| No DPA (GDPR / UK-GDPR / CCPA operator addendum) | Blocks EU + California customers | **P0** |
| No Subprocessor list (Supabase, Stripe, Lovable AI, Resend) | Required by DPA and most vendor security reviews | **P0** |
| No published RTO / RPO | Blocks BC/DR sections of every RFP | **P0** |
| No published data retention + deletion SLA | Blocks GDPR Art. 17 / CCPA §1798.105 | **P1** |
| No published incident-response commitment (72-hr notification etc.) | Blocks GDPR Art. 33 alignment | **P1** |
| No security.txt or coordinated vulnerability disclosure policy | Blocks responsible-disclosure scoring; some RFPs require | **P1** |
| No annual pen-test or SOC 2 report | Blocks SOC 2-driven customers | **P2** (SOC 2 Type II is a multi-quarter effort) |

## NIST 800-53 (moderate baseline) — highest-value gaps

OpsManagerPro would land squarely in NIST 800-53 rev5 **Moderate** territory. Existing controls that already map:

- **AC-2 / AC-3 / AC-6** (Access Enforcement, Least Privilege) — RLS + `has_workspace_permission`.
- **AU-2 / AU-3** (Auditable Events, Content of Audit Records) — audit tables exist.
- **IA-2 / IA-5** (Identification and Authentication, Authenticator Management) — MFA + HIBP.
- **SC-8 / SC-13** (Transmission Confidentiality, FIPS-Validated Cryptography) — TLS in transit (**FIPS unproven**).
- **SI-4** (Info System Monitoring) — `db-integrity-monitor`, `error_logs`.

Gaps blocking a NIST-800-53 moderate mapping:

| Control | Gap | Priority |
|---|---|---|
| **AU-9** Protection of Audit Info | No tamper-evident audit trail (hash chain / WORM) | **P0** |
| **AU-11** Audit Record Retention | Retention policy not defined per record type | **P1** |
| **CP-2/CP-9/CP-10** Contingency Plan / Backup / Recovery | No published plan, no restore drill evidence | **P0** |
| **IR-4/IR-6/IR-8** Incident Handling / Reporting / Plan | No written IR plan or contact channel | **P1** |
| **RA-5** Vulnerability Scanning | No continuous scan + remediation SLA doc | **P1** |
| **SA-11** Developer Security Testing | No documented SAST/DAST cadence | **P2** |
| **SC-13** FIPS crypto | Not attested; Node / Deno defaults, not FIPS module | **P2** |
| **SR-3/SR-4** Supply Chain Controls | No SBOM, no artifact signing | **P1** |
| **CM-8** System Component Inventory | No SBOM or asset inventory | **P1** |

## FedRAMP readiness (planning-only)

Realistic path is **FedRAMP Moderate via a 3PAO** on a dedicated Gov instance — likely 12–18 months and non-trivial capex. Prerequisites:

1. Deployment on a FedRAMP-authorized provider stack. Supabase is not FedRAMP-authorized today; either (a) move Postgres + Storage to a FedRAMP-authorized backend (AWS GovCloud, Azure Gov) or (b) sponsor Supabase authorization (impractical).
2. FIPS 140-2/3 validated crypto boundary end-to-end.
3. SSP (System Security Plan) covering the full NIST 800-53 moderate baseline.
4. Continuous monitoring program (ConMon): monthly OS/container/database scans, POA&M.
5. US-person operations staff for authorized deployment (or a partner that provides them).
6. Full SBOM + supply-chain provenance (SLSA level ≥ 2).

Recommendation: **P3** unless a specific federal contract triggers it. If triggered, spin up a `OpsManagerPro Gov` variant on AWS GovCloud rather than retrofitting the commercial multi-tenant.

## HIPAA — conditional gaps

Only applicable if OpsManagerPro ever stores or processes PHI. If it does not, mark this out of scope.

If PHI is in scope:

| Requirement | Status | Note |
|---|---|---|
| **164.308(a)(1)** Risk analysis | ❌ | Perform + document annually |
| **164.308(a)(3)** Workforce access management | 🟡 | Have RBAC; need documented policy |
| **164.308(a)(6)** Security incident procedures | ❌ | Write IR plan |
| **164.308(b)** BAA with subcontractors | ❌ | Need BAAs from Supabase (available on higher plans), Stripe (typically no PHI in Stripe), Lovable AI, Resend |
| **164.312(a)** Access control | ✅ | RLS + RBAC |
| **164.312(b)** Audit controls | 🟡 | Need tamper-evidence + retention |
| **164.312(c)** Integrity | 🟡 | `database_integrity_log` scaffold |
| **164.312(d)** Person / entity authentication | ✅ | MFA available |
| **164.312(e)** Transmission security | ✅ | TLS |
| **164.316** Documentation | ❌ | Write and version policies |

Do **not** implement HIPAA-shaped features preemptively. Add a "PHI mode" workspace flag (uses `data_classifications`) only when a signed BAA path is in play.

## GDPR / UK-GDPR / CCPA — data-subject rights

| Right | Status | Note |
|---|---|---|
| Access (Art. 15) | 🟡 | Workspace export exists (`src/lib/workspace-export.ts`); no self-serve DSAR portal |
| Rectification (Art. 16) | ✅ | Users can edit their own data |
| Erasure (Art. 17) | 🟡 | `deletion_requests` scaffold; no automated fulfillment |
| Portability (Art. 20) | 🟡 | Export exists; format not documented |
| Objection / restriction (Art. 21) | ❌ | No mechanism |
| Breach notification (Art. 33) | ❌ | No documented process |
| Records of processing (Art. 30) | ❌ | Not maintained |
| DPO / representative | ❌ | Not appointed / disclosed |

## SOC 2 (Type II) — future planning

The controls are largely present; the missing pieces are policy documents, evidence collection, and an auditor engagement. Suggested prep order:

1. Write policies (Information Security, Access Control, Change Management, Incident Response, Vendor Management, BCDR).
2. Turn on continuous evidence collection (Drata / Vanta / Secureframe).
3. Complete a Type I attestation, then a 6-month Type II observation window.

Estimated effort: **P2**, 6–9 months elapsed.
