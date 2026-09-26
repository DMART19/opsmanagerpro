import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface IntegrationDispatchContext {
  companyId: string | null;
  provider: string;
  capability: string;
  operation: string;
  circuitKey?: string;
}

interface GuardRow {
  allowed: boolean;
  reason: string;
  kill_switch_id: string | null;
  circuit_state: "closed" | "open" | "half_open" | "not_checked";
  retry_after_seconds: number;
}

export class IntegrationDispatchBlockedError extends Error {
  readonly code: string;
  readonly retryAfterSeconds: number;
  readonly killSwitchId: string | null;
  readonly circuitState: string;

  constructor(row: Partial<GuardRow> & { reason: string }) {
    super(`Integration dispatch blocked: ${row.reason}`);
    this.name = "IntegrationDispatchBlockedError";
    this.code = row.reason;
    this.retryAfterSeconds = Math.max(0, Number(row.retry_after_seconds ?? 0));
    this.killSwitchId = row.kill_switch_id ?? null;
    this.circuitState = row.circuit_state ?? "unknown";
  }
}

async function guardImmediatelyBeforeDispatch(
  admin: SupabaseClient,
  context: IntegrationDispatchContext,
): Promise<void> {
  const { data, error } = await admin.rpc("integration_pre_dispatch_guard", {
    p_company_id: context.companyId,
    p_provider: context.provider,
    p_capability: context.capability,
    p_operation: context.operation,
    p_circuit_key: context.circuitKey ?? "global",
  });

  // Fail closed: a broken control plane must never become an integration bypass.
  if (error) {
    console.error("[integration-resilience] pre-dispatch guard failed", error.message);
    throw new IntegrationDispatchBlockedError({
      reason: "guard_unavailable",
      circuit_state: "not_checked",
      retry_after_seconds: 30,
    });
  }

  const row = (Array.isArray(data) ? data[0] : data) as GuardRow | null;
  if (!row?.allowed) {
    throw new IntegrationDispatchBlockedError(
      row ?? {
        reason: "guard_invalid_response",
        circuit_state: "not_checked",
        retry_after_seconds: 30,
      },
    );
  }
}

async function recordSuccess(
  admin: SupabaseClient,
  context: IntegrationDispatchContext,
): Promise<void> {
  const { error } = await admin.rpc("integration_record_provider_success", {
    p_provider: context.provider,
    p_circuit_key: context.circuitKey ?? "global",
  });
  if (error) console.error("[integration-resilience] success record failed", error.message);
}

async function recordOutageFailure(
  admin: SupabaseClient,
  context: IntegrationDispatchContext,
  errorCode: string,
): Promise<void> {
  const { error } = await admin.rpc("integration_record_provider_failure", {
    p_provider: context.provider,
    p_circuit_key: context.circuitKey ?? "global",
    p_error_code: errorCode.slice(0, 120),
  });
  if (error) console.error("[integration-resilience] failure record failed", error.message);
}

function responseRepresentsProviderOutage(value: unknown): boolean {
  if (!(value instanceof Response)) return false;
  return value.status === 408 || value.status === 429 || value.status >= 500;
}

/**
 * Every provider adapter and every queued integration Job must call this wrapper at the
 * final provider-dispatch boundary. The authoritative kill-switch/circuit query is made
 * immediately before dispatch(), so a Job that sat in a queue cannot rely on stale state.
 *
 * Provider outage signals (network exceptions, 408, 429, and 5xx) count toward the
 * persistent circuit breaker. Ordinary 4xx responses prove the provider is reachable and
 * therefore close/reset the outage circuit rather than opening it.
 */
export async function dispatchProviderRequest<T>(
  admin: SupabaseClient,
  context: IntegrationDispatchContext,
  dispatch: () => Promise<T>,
  options: {
    isOutageResult?: (value: T) => boolean;
    isOutageError?: (error: unknown) => boolean;
  } = {},
): Promise<T> {
  // IMPORTANT: do not move provider I/O above this call.
  await guardImmediatelyBeforeDispatch(admin, context);

  try {
    const result = await dispatch();
    const isOutage = options.isOutageResult
      ? options.isOutageResult(result)
      : responseRepresentsProviderOutage(result);

    if (isOutage) {
      const status = result instanceof Response ? String(result.status) : "provider_outage_result";
      await recordOutageFailure(admin, context, status);
    } else {
      await recordSuccess(admin, context);
    }

    return result;
  } catch (error) {
    if (error instanceof IntegrationDispatchBlockedError) throw error;

    const isOutage = options.isOutageError ? options.isOutageError(error) : true;
    if (isOutage) {
      const errorCode = error instanceof Error ? error.name : "provider_dispatch_exception";
      await recordOutageFailure(admin, context, errorCode);
    }
    throw error;
  }
}
