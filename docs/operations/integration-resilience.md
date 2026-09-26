# Integration resilience controls (requirements 38-39)

OpsManagerPro now has one authoritative server-side dispatch boundary for outbound integrations.

## Kill switches

Platform owners can stop:
- every integration,
- one provider,
- one company/workspace,
- one capability,
- one configured provider operation.

Rules live in `integration_kill_switches`. They are read by `integration_pre_dispatch_guard` at the final dispatch boundary. Do not cache the result in a queued job. A job may be queued while integrations are enabled and still be blocked if the owner activates a rule before provider I/O begins.

## Circuit breakers

`integration_provider_circuits` persists provider health across processes and restarts. Gmail, Slack, OpenRouter, and configured HTTPS are pre-seeded. Future providers are created lazily when first dispatched.

Outage signals are network exceptions, HTTP 408, HTTP 429, and HTTP 5xx. Ordinary 4xx responses indicate that the provider is reachable and do not count as a provider outage.

After the failure threshold is reached, the circuit opens with an exponential cooldown. When cooldown expires, exactly one worker claims a half-open probe under a row lock. A failed probe re-opens the circuit; a successful probe closes it. A stale half-open claim expires after 60 seconds so a crashed worker cannot prevent durable recovery.

## Provider adapter contract

Every provider adapter and every queued integration Job must call:

`dispatchProviderRequest(admin, context, dispatch)`

from `supabase/functions/_shared/integration-resilience.ts`.

No provider network request may happen before that wrapper. The wrapper fails closed if the guard RPC is unavailable.

The existing Load Plan AI HTTPS call is wired through this path as the first live integration dispatch.
