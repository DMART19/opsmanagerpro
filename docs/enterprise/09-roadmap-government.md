# 09 — Government Readiness Roadmap

Path from commercial SaaS to government-adjacent, then FedRAMP-authorized. Do not chase FedRAMP speculatively — it is a 12–18-month, seven-figure program. Only start when a named federal customer or reseller relationship exists.

## Stage G0 — "Government-adjacent commercial" (today → Q1)

Sellable to government contractors and state/local without an ATO. Requires:

- **[P1]** NIST 800-53 rev5 Moderate mapping doc (control-by-control, current + planned).
- **[P1]** SBOM per release (CycloneDX).
- **[P1]** Continuous vulnerability scanning + remediation SLA published.
- **[P1]** Vulnerability disclosure policy + `security.txt`.
- **[P1]** Documented Secure SDLC (SSDF-aligned; NIST SP 800-218).
- **[P1]** All the P0/P1 items from the Commercial roadmap (07).

## Stage G1 — "StateRAMP or CJIS / IRS-1075 ready" (Q3+)

For state/local + certain federal-adjacent contracts. Typically simpler than full FedRAMP.

- **[P2]** Single-tenant deployment in the target region.
- **[P2]** US-person operations attestation (if required).
- **[P2]** Full policy set + evidence collection (Drata / Vanta will already cover most).
- **[P2]** Pen-test with US-based firm.
- **[P2]** Background checks on operations staff.

## Stage G2 — "FedRAMP Moderate" (12–18 months, only if triggered)

- **[P3]** Move backend to a FedRAMP-authorized IaaS (AWS GovCloud, Azure Gov, or the US Commercial cloud with FedRAMP High marketplace).
- **[P3]** Adopt FIPS 140-2/3 validated crypto boundary end-to-end. Node/Deno crypto is not FIPS-validated; either use OpenSSL FIPS or a validated KMS/HSM for all cryptographic operations at the boundary.
- **[P3]** Full SSP (System Security Plan), SSP addenda, CIS.
- **[P3]** Sponsor + 3PAO engagement.
- **[P3]** ConMon program: monthly scans, POA&M, incident reporting to sponsor.
- **[P3]** Separate `OpsManagerPro Gov` code channel with vendored dependencies pinned to FedRAMP-approved versions.

## Stage G3 — "IL4 / IL5 / IL6" (only if DoD)

- **[P3]** Only pursue via a partner already operating at these impact levels.
- **[P3]** Typically air-gapped or classified enclave — see On-Prem blueprint (12).

## Cross-cutting government asks

| Ask | Answer today | Roadmap slot |
|---|---|---|
| SBOM (Executive Order 14028) | Missing | Q1 (P1) |
| Software attestation (CISA form) | Missing | Q2 (P1) |
| Signed release artifacts (SLSA ≥ 2) | Missing | Q2 (P1) |
| FIPS 140-2/3 crypto | Missing | G2 (P3) |
| US-person ops | Not attested | G1 (P2) |
| Least-privilege enforcement | Present (RLS + RBAC) | ✅ |
| MFA on all admin accounts | Available; enforce for enterprise | Q1 (P0) |
| Continuous vulnerability management | Missing continuous CI | Q2 (P1) |
| Encryption in transit + at rest | ✅ / ⚠️ (provider-managed, attestation missing) | Q1 (P0) |
| Audit logging + retention | Present; tamper-evidence missing | Q1 (P0) |

## Recommendation

Complete Stage G0 within the Commercial roadmap effort — the work overlaps ~80% with SOC 2 and Enterprise SaaS work. Do not begin G1/G2 unless a named opportunity exists with a customer willing to underwrite the deployment cost.
