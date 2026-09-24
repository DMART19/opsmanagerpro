# 05 — Operational Gaps

Where OpsManagerPro's day-2 story falls short of enterprise expectations.

## Support operations

| Gap | Impact | Priority |
|---|---|---|
| No ticketing system with SLA tracking | Enterprises expect ticket IDs, response SLAs, escalation paths | **P0** |
| No priority tiers (P1/P2/P3 with response commitments) | Blocks paid support tier | **P1** |
| No on-call / emergency contact channel published | Blocks 24×7 outage handling | **P1** |
| No public status page (status.opsmanagerpro.com) | Blocks SLA + procurement questions | **P1** |
| No knowledge base indexable by customers | Increases support load | **P2** |
| No named CSM motion for enterprise | Blocks account retention & QBRs | **P2** |

**Recommendation:** integrate a hosted ticketing system (Freshdesk / Zendesk / Plain) fed by the existing `support_messages` table, and publish `status.opsmanagerpro.com` (Statuspage / Instatus / Better Stack). Neither requires major code changes.

## Monitoring & alerting

| Gap | Impact | Priority |
|---|---|---|
| No external uptime monitoring | Enterprises will ask for evidence | **P0** |
| No published SLO / error budgets | Cannot commit to SLA numbers | **P1** |
| No PagerDuty / Opsgenie bridge for alerts | Alerts today are DB-only (`admin_alerts`) | **P1** |
| No APM for user experience (Real User Monitoring) | Slow-page complaints are hard to root-cause | **P2** |
| No metrics dashboard for edge-function health | Regressions detected only in error logs | **P2** |

**Recommendation:** wire the existing `error_logs` + `performance_metrics` + `page_performance` tables to a hosted analytics endpoint. Add Better Stack / Uptime.com for HTTP checks against the published domain + auth landing + representative authed API.

## Change management

| Gap | Impact | Priority |
|---|---|---|
| No customer-visible release notes / changelog | Enterprise change control requires it | **P0** |
| No maintenance-window notification path | Required for regulated customers | **P1** |
| No feature-flag rollout policy documented | Ad-hoc dark launches confuse customers | **P2** |
| No versioned API contract | Blocks integrations | **P2** |

**Recommendation:** publish `/changelog` on the marketing site pulling from `docs/releases/`. For each release: date, features, fixes, security fixes.

## Backup & disaster recovery ops

| Gap | Impact | Priority |
|---|---|---|
| No published RTO / RPO | Blocks every enterprise BC/DR review | **P0** |
| No restore drill evidence | Auditors ask for date + outcome | **P0** |
| No customer-controlled backup destination | Blocks BYO-storage customers | **P2** |
| No per-workspace scheduled export to customer S3 | Common enterprise ask | **P1** |

**Recommendation:** define initial commitments (e.g., **RTO 4 h, RPO 1 h**) that Supabase managed tier can defensibly meet. Run one drill per quarter; record the runbook in `docs/enterprise/dr-runbook.md`.

## Onboarding & offboarding

| Gap | Impact | Priority |
|---|---|---|
| No white-glove enterprise onboarding runbook | Slower expansion revenue | **P1** |
| No SOW template for professional services | Blocks paid implementation | **P2** |
| No documented offboarding SLA (data export + destruction) | Blocks GDPR / procurement | **P0** |
| No confirmation-of-destruction certificate | Frequent regulator ask | **P1** |

**Recommendation:** on offboarding, provide (a) full export via `workspace-export`, (b) confirmation the workspace is soft-deleted, (c) hard-delete after N days with certificate of destruction (signed JSON with workspace hash + timestamp).

## Documentation

Missing (all **P0–P1** for enterprise):

- Administrator guide
- Deployment / architecture doc (SaaS today; on-prem later)
- Backup + DR runbook
- Security guide (customer-facing)
- API documentation (once an API is exposed)
- Enterprise onboarding runbook
- Release notes / changelog

Present and reusable:
- `docs/security/phase-2-summary.md`
- `docs/security/http-only-cookie-session-migration.md`
- `EXCEL_UPLOAD_GUIDE.md`
- `FLEXIBLE_MAPPING_REDESIGN.md`

## Vendor / subprocessor management

Subprocessors that must be disclosed and BAA / DPA-covered as applicable:

1. **Supabase / Lovable Cloud** — Postgres, auth, storage, edge functions.
2. **Stripe** — payments (no PHI expected, avoid PHI in metadata).
3. **Lovable AI Gateway** — model-provider proxy for `load-plan-chat`, warehouse generation. Data residency and retention need to be surfaced.
4. **Resend** (implied via email hooks) — auth + transactional email.
5. **Cloudflare** (implied via preview hosts) — CDN / TLS.
6. Any analytics vendor if added later.

Publish `docs/enterprise/subprocessors.md` listing each vendor, purpose, data types, region, DPA status.

## Enterprise change-management for the platform team itself

- No published deployment cadence (continuous is fine — say so).
- No documented hotfix path.
- No documented rollback path (Lovable publish supports it — document + test).
- No annual pen-test cadence.
- No annual DR drill cadence.
- No security-training cadence for engineering (needed for SOC 2).
