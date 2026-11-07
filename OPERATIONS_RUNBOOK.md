# OpsManagerPro operations runbook

Complete and rehearse these steps in staging before enabling live billing or customer data. Store secrets in the deployment platform; record only secret names and rotation owners here.

## Ownership

- Service owner:
- On-call contact:
- Billing support owner:
- Database owner:
- Incident contact:
- Last reviewed:

## Monitoring and alerts

- Application health endpoint:
- Database connectivity and saturation alerts:
- Billing webhook delivery/error alerts:
- Failed/overdue payment queue alerts:
- Alert destination and acknowledgement expectation:

## Billing incident response

1. If charge amounts or subscription state may be wrong, disable new checkout using the documented feature flag.
2. Preserve Stripe event IDs and internal correlation IDs; do not log card data or secret values.
3. Check webhook signature validation, duplicate-event handling, configured price IDs, and subscription state transitions.
4. Reconcile affected customer records with Stripe before retrying any operation.
5. Restore checkout only after a staging lifecycle test passes and the billing owner approves.

## Recovery and release record

- Release commit and CI run:
- Migration set:
- Backup identifier and restore verification:
- Rollback/forward-fix steps:
- Tenant-isolation acceptance evidence:
- Billing lifecycle acceptance evidence:
- Operator and completion time:

A written procedure does not prove a completed drill. Attach dated staging results before release.
