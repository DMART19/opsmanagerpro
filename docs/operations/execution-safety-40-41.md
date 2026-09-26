# Execution safety tests (requirements 40-41)

## 40. Idempotency chaos

Consequential provider operations use a durable unique idempotency key. The production migration adds `consequential_operation_executions` and an atomic `INSERT ... ON CONFLICT DO NOTHING` claim. Only the worker that wins the claim may transition to `dispatching`.

The provider request ID is the stable idempotency key. If the worker loses the response after provider dispatch, the operation becomes `ambiguous`; retries do not blindly dispatch again. Reconciliation queries the provider using the preserved request ID. A confirmed provider success closes the ledger as succeeded. A confirmed not-found result marks the attempt failed/retry-safe. Unknown stays ambiguous.

The deterministic chaos test launches 256 concurrent workers against the same authorized operation and asserts exactly one provider dispatch.

## 41. Property-based authorization

OpsManagerPro did not previously have GetDone's Plan/grant/portfolio/environment execution model. Rather than write tests against nonexistent objects, this change adds a pure fail-closed execution authorization contract covering:
- company
- portfolio
- environment
- resource
- Plan + Plan version
- approval + approval Plan binding
- authorization grant scope
- grant expiry
- capability
- kill switch
- credential company/environment/capability scope

The property sweep evaluates 8,192 combinations. Only the fully bound valid combination is permitted. Every mutation of an authorization dimension is denied.

This core is intentionally pure so provider/job adapters can evaluate the same invariant immediately before consequential execution without network/cache behavior changing authorization semantics.
