# 01 — Readiness by Category

Legend: **✅ Complete** · **🟡 Partial** · **❌ Missing** · **⚪ N/A**

Evidence columns cite files, tables, or migrations in this repo.

---

## 1. Enterprise Contracts & Legal Readiness

| Item | Status | Evidence / Note |
|---|---|---|
| Terms of Service | 🟡 | `src/pages/legal/TermsOfService.tsx` (consumer-style, not enterprise MSA) |
| Privacy Policy | ✅ | `src/pages/legal/PrivacyPolicy.tsx` |
| Cookie Policy | ✅ | `src/pages/legal/CookiePolicy.tsx` |
| Acceptable Use Policy | ✅ | `src/pages/legal/AcceptableUsePolicy.tsx` |
| Security Policy | 🟡 | `src/pages/legal/SecurityPolicy.tsx` — describes posture, not a signable addendum |
| Master Service Agreement | ❌ | Not present |
| Data Processing Addendum (DPA / GDPR) | ❌ | Not present |
| Service Level Agreement | ❌ | No published SLA / uptime commitment |
| Business Associate Agreement (HIPAA) | ⚪ | Only needed if PHI use case adopted |
| Data Ownership clause | 🟡 | Implied in Privacy; not called out contractually |
| Data Retention policy (customer-facing) | 🟡 | `data_governance_policies`, `deletion_requests`, `enforce-retention` fn — no external policy doc |
| Offboarding / data export commitment | 🟡 | `src/lib/workspace-export.ts` exists; not contractually documented |
| Enterprise Support contract | ❌ | Not present |
| Security Addendum | ❌ | Not present |
| Disaster Recovery commitment | ❌ | Backup infra exists; no RTO/RPO published |
| Insurance requirements (Cyber, E&O) | ❌ | Not disclosed |
| Subprocessor list | ❌ | Not published (Supabase, Stripe, Lovable AI, Resend implied) |

---

## 2. Enterprise Licensing System

| Item | Status | Evidence |
|---|---|---|
| SaaS entitlements (Stripe) | ✅ | `src/config/plans.ts`, `src/config/stripe-plans.ts`, `stripe-webhook`, `workspace_plans` table |
| Feature flags | ✅ | `feature_flags`, `workspace_feature_flags` tables |
| User limits | 🟡 | `usage_limits` table + `backend-limit-enforcement` memory; not surfaced as a signed license |
| Facility / workspace limits | 🟡 | Enforced via subscription tier in Stripe, not portable |
| Signed license files | ❌ | Not implemented |
| Offline activation | ❌ | N/A — SaaS-only |
| Online activation | 🟡 | Implicit via Stripe checkout; no explicit activation ceremony |
| Grace periods | 🟡 | `past_due` / `read_only` states referenced in memory + `BillingLifecycleSection.tsx` |
| Manual renewal | ❌ | All renewals go through Stripe |
| Enterprise activation codes | ❌ | Not implemented |
| License validation | ⚪ | N/A for SaaS; needed for on-prem |
| On-prem licensing | ❌ | Not implemented |

---

## 3. Enterprise Deployment Readiness

| Item | Status | Evidence |
|---|---|---|
| SaaS (multi-tenant) | ✅ | Current production model |
| Dedicated Cloud (single-tenant) | ❌ | No isolation blueprint; shared Supabase project |
| Customer-Owned Cloud (BYOC) | ❌ | Codebase assumes Lovable-managed Supabase URL and Lovable AI Gateway |
| On-Premises | ❌ | Not supported |
| Air-Gapped | ❌ | Depends on Stripe, Lovable AI, Supabase managed URL |
| Docker deployment | ❌ | No Dockerfile in repo |
| Kubernetes | ❌ | No manifests / Helm chart |
| Local server deployment | ❌ | Not supported |
| Offline installer | ❌ | Not supported |
| Installer wizard | ❌ | Not supported |
| Silent install | ❌ | Not supported |
| Upgrade packages | ❌ | SaaS-only continuous deploy |
| Rollback packages | ❌ | Not supported (Lovable publish only) |

---

## 4. Authentication & Identity

| Item | Status | Evidence |
|---|---|---|
| Local accounts (email/password) | ✅ | `src/pages/Auth.tsx`, Supabase auth |
| Google OAuth | ✅ | Configured via Lovable Cloud managed auth |
| Microsoft Entra ID (Azure AD) | ❌ | Not supported natively in Lovable Cloud |
| Active Directory (Kerberos/LDAP) | ❌ | Not supported |
| LDAP | ❌ | Not supported |
| SAML 2.0 | 🟡 | Supabase supports it; not currently configured. `supabase--configure_saml_sso` available |
| OpenID Connect (custom IdP) | ❌ | Not exposed |
| MFA (TOTP) | ✅ | `src/lib/auth/mfa.ts`, `src/hooks/use-mfa-status.ts`, `MFAEnrollDialog.tsx` |
| Password policy (length + block-list + HIBP) | ✅ | `src/config/security.ts` PASSWORD_MIN_LENGTH=12; `password_hibp_enabled: true` per config |
| Session expiration (idle + absolute) | ✅ | `IDLE_TIMEOUT_MINUTES`, `ABSOLUTE_SESSION_HOURS`; `SessionTimeoutManager.tsx` |
| Account lockout / rate limiting on auth | 🟡 | Rate limits exist (`rate_limits` table); no persistent lockout counter surfaced |
| SCIM 2.0 provisioning | ❌ | Not implemented |
| JIT provisioning | ❌ | Not implemented |
| Step-up re-authentication | ✅ | `src/lib/auth/step-up.ts`, `StepUpAuthDialog.tsx`, `SENSITIVE_ACTIONS` catalog |

---

## 5. Authorization

| Item | Status | Evidence |
|---|---|---|
| RBAC | ✅ | `user_roles` (super_admin/admin/manager/technician/staff/viewer); `team_roles` for workspace tier |
| Roles in dedicated table | ✅ | `user_roles` table, `has_role` security-definer function |
| Workspace-scoped permissions | ✅ | `src/lib/workspace-permissions.ts`, `has_workspace_permission()` |
| Custom roles | ❌ | Roles are enum-fixed |
| Department permissions | 🟡 | `departments` table exists; permissions not attached |
| Warehouse / facility permissions | 🟡 | Filtering exists in UI; not enforced at RLS scope |
| Read-only roles | ✅ | `viewer` role |
| Enterprise-admin console | 🟡 | `SuperAdminRoute` exists but is founder-scoped, not customer-facing |
| Temporary elevated permissions | ❌ | No time-bound elevation |
| Permission audit log | ✅ | `permission_audit_logs` |

---

## 6. Audit Logging

| Item | Status | Evidence |
|---|---|---|
| Auth events | ✅ | `security_events` (`failed_login`, `mfa_*`, `password_changed`, `step_up_*`, `session_*`) |
| Inventory changes | 🟡 | `change_history`, `audit_logs`; coverage not comprehensively enforced |
| Warehouse twin | 🟡 | Mutations restricted; log presence not verified across all paths |
| Pallet / Trailer builder | ❌ | Design changes not logged |
| Shipments | 🟡 | `audit_logs` used; not per-mutation guaranteed |
| Imports / exports | 🟡 | `data_access_logs` exists; import/export path coverage partial |
| Settings changes | 🟡 | Partial via `audit_logs` |
| Permission changes | ✅ | `permission_audit_logs` |
| License / plan changes | 🟡 | Stripe webhook writes; no dedicated audit entry |
| Administrative actions | 🟡 | Some paths log via `logSecurityEvent`; not exhaustive |
| Backups | ✅ | `backup_records`, `snapshot_audit_logs` |
| System / integrity changes | ✅ | `database_integrity_log`, `db-integrity-monitor` fn |
| Tamper resistance (hash chain, WORM) | ❌ | Rows are mutable by service_role; no cryptographic chain |
| Export capability (SIEM) | ❌ | No customer-facing export API for audit logs |
| Long-term retention policy | ❌ | Retention rules not published; `enforce-retention` exists but customer-invisible |

---

## 7. Data Protection

| Item | Status | Evidence |
|---|---|---|
| Encryption in transit | ✅ | HTTPS enforced, HSTS, `enforceHTTPS()` runtime check |
| Encryption at rest | ✅ | Supabase-managed (Postgres + Storage); not customer-attested |
| Secrets management | ✅ | Lovable secrets vault; `secrets_audit_log`; never in repo |
| Key rotation | 🟡 | Rotation possible (Supabase JWT, Lovable API key) but no rotation cadence published |
| Secure file storage | 🟡 | Supabase Storage with RLS-scoped buckets |
| Backup encryption | 🟡 | Supabase-managed backups encrypted; customer-visible attestation missing |
| Data integrity | ✅ | `database_integrity_log`, `db-integrity-monitor` |
| Secure deletion | 🟡 | `deletion_requests` scaffolding; hard-delete workflow not fully wired |
| Customer-owned storage (BYOK / BYOS) | ❌ | Not supported |
| Support for MinIO / S3 / Azure Storage / NAS | ❌ | Not supported |
| Client-side masking of PII in logs | ✅ | `src/lib/data-security.ts` `sanitizeForLogging`, `maskEmail`, `maskPhone` |

---

## 8. Backup & Disaster Recovery

| Item | Status | Evidence |
|---|---|---|
| Database backup | 🟡 | Supabase daily backups + `backup_records`; no customer-controlled schedule |
| File backup | 🟡 | Storage bundled into Supabase backups |
| Configuration backup | 🟡 | Migrations tracked in repo; workspace settings covered by snapshots |
| Restore procedure | ❌ | Not documented for customers |
| Restore validation drill | ❌ | No evidence of a drill recorded |
| Point-in-Time Recovery | 🟡 | Supabase PITR available on plan; not surfaced |
| Backup scheduling (per-customer) | 🟡 | `backup_config` table; no UI for enterprise cadence |
| Backup encryption | 🟡 | Provider-managed |
| Snapshot audit | ✅ | `snapshot_audit_logs`, `create-scheduled-snapshots` |
| DR documentation | ❌ | Not published |

---

## 9. Monitoring & Operations

| Item | Status | Evidence |
|---|---|---|
| System health | 🟡 | `recovery_checks`, `error_logs`, `performance_metrics` |
| API health | 🟡 | `api_response_cache`, `api-performance-tracker.ts` |
| Database health | 🟡 | `db-integrity-monitor` fn; `database_integrity_log` |
| Workers / queues | 🟡 | `process-email-queue`, `email_send_state` |
| Storage monitoring | ❌ | Not surfaced |
| Application logging | ✅ | `error_logs`, `prod-logger.ts` |
| Alerting | 🟡 | `admin_alerts`, `system_announcements` — internal; no PagerDuty/Opsgenie bridge |
| Monitoring dashboard | 🟡 | `SuperAdmin` + `WorkspaceAnalytics` pages |
| Uptime SLO | ❌ | Not defined |

---

## 10. Security

| Item | Status | Evidence |
|---|---|---|
| Dependency security | ✅ | `code--dependency_scan` clean at audit time |
| Vulnerability scanning (continuous) | 🟡 | Manual scan available; no continuous CI wiring |
| Pen-test readiness | 🟡 | No prior report; architecture supports it |
| Patch management | 🟡 | Continuous SaaS deploy; no formal cadence doc |
| Incident response plan | ❌ | Not documented |
| Security contact (security.txt) | ❌ | Missing at `/.well-known/security.txt` |
| Coordinated vulnerability disclosure | ❌ | No public policy |
| Application logging | ✅ | See above |
| Rate limiting | ✅ | `rate_limits` table + `_shared/rate-limit.ts` + `src/lib/rate-limit.ts` |
| Security headers | ✅ | `public/_headers` (CSP, HSTS, XFO, Referrer, Permissions-Policy) |
| Auth security | ✅ | MFA, HIBP, step-up, idle/absolute timeout |
| OWASP top 10 posture | ✅ | RLS everywhere, parameterized queries via Supabase client, XSS-safe React, CSP, no `dangerouslySetInnerHTML` on user data (per data-security notes) |
| Secrets in code | ✅ | Only anon key (public); no service role in client |
| CORS on edge functions | 🟡 | `_shared/cors.ts` — verify strict allowlist per function |
| Workspace-scoped write checks | 🟡 | Scanner flagged `staff` and `custom_fields` policy scope (see `04-gaps-security.md`) |

---

## 11. Documentation

| Item | Status | Evidence |
|---|---|---|
| Administrator guide | ❌ | Not present |
| Installation guide | ⚪ | N/A for SaaS |
| Deployment guide | ❌ | Not present |
| Upgrade guide | ❌ | Not present |
| Backup guide | ❌ | Not present |
| Disaster recovery guide | ❌ | Not present |
| Architecture doc | 🟡 | `docs/security/*`, `EXCEL_UPLOAD_GUIDE.md`, `FLEXIBLE_MAPPING_REDESIGN.md` — partial |
| Release notes | ❌ | Not published |
| Security guide (customer-facing) | 🟡 | `SecurityPolicy.tsx` + `docs/security/phase-2-summary.md` |
| API documentation | ❌ | No public API surface documented |
| Enterprise onboarding runbook | ❌ | Not present |

---

## 12. Enterprise Support

| Item | Status | Evidence |
|---|---|---|
| In-app support form | ✅ | `ContactSupportModal.tsx`, `support_messages` table |
| Ticketing / SLA-tracked | ❌ | No Zendesk/Freshdesk/Jira bridge |
| Support portal (customer-facing) | ❌ | Not present |
| Knowledge base | 🟡 | `Help*` components exist; not externally addressable |
| Priority support tiers | ❌ | Not tiered |
| Emergency contacts / on-call | ❌ | Not published |
| Response-time commitments | ❌ | Not published |
| Escalation matrix | ❌ | Not published |
| Customer success motion | ❌ | Not defined |

---

## 13. Enterprise Updates

| Item | Status | Evidence |
|---|---|---|
| Signed update packages | ❌ | Continuous SaaS deploy only |
| Manual updates | ❌ | Not offered |
| Offline / air-gapped updates | ❌ | Not offered |
| Rollback | 🟡 | Lovable publish history; not exposed as artifact |
| Version compatibility policy | ❌ | Not published |
| Migration scripts | 🟡 | `supabase/migrations/*` exist; not versioned for external consumers |
| Hotfix process | ❌ | Not defined externally |
| LTS branch | ❌ | Not defined |

---

## 14. API Security

| Item | Status | Evidence |
|---|---|---|
| API keys (customer-issued) | ❌ | Not offered — Supabase anon key only |
| OAuth 2.0 authorization server | ⚪ | Not required by product today |
| Per-endpoint rate limits | ✅ | `_shared/rate-limit.ts` used by edge functions |
| Webhook security | ✅ | Stripe webhook signature verified in `stripe-webhook/index.ts` |
| API versioning | ❌ | No `/v1/` prefix or contract |
| Enterprise API docs | ❌ | Not present |
| JWT validation in edge fns | 🟡 | `verify_jwt` per function; audit each function's `config.toml` |

---

## 15. HIPAA Readiness (Conditional on PHI)

**Applicable only if OpsManagerPro stores or processes PHI.** No PHI use
case exists today, so items below are gap analysis, not immediate work.

| Item | Status | Note |
|---|---|---|
| Administrative safeguards | ❌ | Security officer, workforce training, sanction policy — not documented |
| Technical safeguards — access controls | ✅ | RBAC + RLS present |
| Technical safeguards — audit controls | 🟡 | Audit logs exist; tamper evidence missing |
| Technical safeguards — integrity | 🟡 | `database_integrity_log` present |
| Technical safeguards — transmission security | ✅ | TLS-only |
| Encryption of PHI at rest | 🟡 | Provider-managed; needs contractual attestation |
| Business Associate Agreement | ❌ | Not offered; would need Supabase, Stripe, Lovable AI BAAs upstream |
| Risk analysis | ❌ | Not performed |
| Contingency plan (DR) | ❌ | See §8 |
| PHI data classification | 🟡 | `data_classifications` scaffold exists; unused |

---

## 16. Federal / Government Readiness

| Item | Status | Note |
|---|---|---|
| NIST 800-53 mapping | ❌ | Not mapped |
| FedRAMP readiness planning | ❌ | Not started; SaaS backend is not FedRAMP authorized |
| FIPS 140-2/3 crypto | ❌ | No FIPS module in use (Node/Deno defaults) |
| SBOM (CycloneDX / SPDX) | ❌ | Not generated |
| Supply chain security (signed builds) | ❌ | No provenance / SLSA level |
| Secure SDLC | 🟡 | Migrations reviewed; no formal SSDLC doc |
| Least privilege | ✅ | RLS + service_role isolation in edge fns |
| MFA | ✅ | See §4 |
| Continuous vulnerability management | 🟡 | Dependency scan on demand |

---

## 17. Enterprise Operations

| Item | Status | Note |
|---|---|---|
| Customer onboarding runbook | 🟡 | In-app onboarding; no white-glove doc |
| Enterprise training program | ❌ | Not offered |
| Renewals process | 🟡 | Via Stripe portal only |
| Account management | ❌ | No named CSM motion |
| Professional services / implementation | ❌ | Not productized |
| Quarterly business reviews | ❌ | Not defined |
| Offboarding (data export + destruction) | 🟡 | Export exists; destruction SLA missing |
| Change management (customer-visible) | ❌ | No changelog / release notes surfaced |

---

## 18. Enterprise On-Premises Readiness

All items ❌ today. See [12-onprem-installer-blueprint.md](./12-onprem-installer-blueprint.md) for the forward plan.

| Item | Status |
|---|---|
| Windows Server installer | ❌ |
| Linux installer | ❌ |
| Customer-selected storage locations | ❌ |
| Local PostgreSQL support | ❌ |
| NAS / MinIO / S3 storage support | ❌ |
| Local backups | ❌ |
| Manual signed update packages | ❌ |
| Air-gapped compatibility | ❌ |
| Offline activation | ❌ |
| Customer data ownership separated from licensing | ❌ |