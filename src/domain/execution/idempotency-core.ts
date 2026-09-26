export type ConsequentialExecutionState =
  | "claimed"
  | "dispatching"
  | "succeeded"
  | "ambiguous"
  | "failed";

export interface ConsequentialExecutionRecord {
  idempotencyKey: string;
  state: ConsequentialExecutionState;
  providerRequestId?: string;
  attempts: number;
}

export interface ConsequentialExecutionStore {
  claim(idempotencyKey: string): Promise<"claimed" | "already_claimed">;
  markDispatching(idempotencyKey: string, providerRequestId: string): Promise<void>;
  markSucceeded(idempotencyKey: string): Promise<void>;
  markAmbiguous(idempotencyKey: string): Promise<void>;
  markFailed(idempotencyKey: string): Promise<void>;
  get(idempotencyKey: string): Promise<ConsequentialExecutionRecord | null>;
}

export interface ProviderOutcome {
  kind: "success" | "definite_failure" | "ambiguous";
}

/**
 * Process-local implementation used by deterministic chaos/property tests.
 * Production uses the database uniqueness/claim contract in
 * 20260926170000_execution_safety_40_41.sql.
 */
export class InMemoryConsequentialExecutionStore implements ConsequentialExecutionStore {
  private readonly records = new Map<string, ConsequentialExecutionRecord>();

  async claim(key: string) {
    if (this.records.has(key)) return "already_claimed" as const;
    this.records.set(key, { idempotencyKey: key, state: "claimed", attempts: 0 });
    return "claimed" as const;
  }

  async markDispatching(key: string, providerRequestId: string) {
    const row = this.records.get(key);
    if (!row) throw new Error("execution_not_claimed");
    row.state = "dispatching";
    row.providerRequestId = providerRequestId;
    row.attempts += 1;
  }

  async markSucceeded(key: string) {
    const row = this.records.get(key);
    if (!row) throw new Error("execution_not_claimed");
    row.state = "succeeded";
  }

  async markAmbiguous(key: string) {
    const row = this.records.get(key);
    if (!row) throw new Error("execution_not_claimed");
    row.state = "ambiguous";
  }

  async markFailed(key: string) {
    const row = this.records.get(key);
    if (!row) throw new Error("execution_not_claimed");
    row.state = "failed";
  }

  async get(key: string) {
    return this.records.get(key) ?? null;
  }
}

export async function executeConsequentialOperation(
  store: ConsequentialExecutionStore,
  idempotencyKey: string,
  dispatch: (providerRequestId: string) => Promise<ProviderOutcome>,
): Promise<"dispatched" | "duplicate" | "ambiguous"> {
  const claim = await store.claim(idempotencyKey);
  if (claim === "already_claimed") {
    const existing = await store.get(idempotencyKey);
    return existing?.state === "ambiguous" ? "ambiguous" : "duplicate";
  }

  const providerRequestId = idempotencyKey;
  await store.markDispatching(idempotencyKey, providerRequestId);

  try {
    const outcome = await dispatch(providerRequestId);
    if (outcome.kind === "success") {
      await store.markSucceeded(idempotencyKey);
      return "dispatched";
    }
    if (outcome.kind === "ambiguous") {
      await store.markAmbiguous(idempotencyKey);
      return "ambiguous";
    }
    await store.markFailed(idempotencyKey);
    return "dispatched";
  } catch {
    // A timeout/disconnect after provider dispatch is not proof that the provider
    // did nothing. Preserve the provider request id and require reconciliation.
    await store.markAmbiguous(idempotencyKey);
    return "ambiguous";
  }
}

export async function reconcileAmbiguousOperation(
  store: ConsequentialExecutionStore,
  idempotencyKey: string,
  lookupProviderOutcome: (providerRequestId: string) => Promise<"succeeded" | "not_found" | "unknown">,
): Promise<"succeeded" | "retry_safe" | "still_ambiguous"> {
  const row = await store.get(idempotencyKey);
  if (!row || row.state !== "ambiguous" || !row.providerRequestId) return "still_ambiguous";

  const outcome = await lookupProviderOutcome(row.providerRequestId);
  if (outcome === "succeeded") {
    await store.markSucceeded(idempotencyKey);
    return "succeeded";
  }
  if (outcome === "not_found") {
    await store.markFailed(idempotencyKey);
    return "retry_safe";
  }
  return "still_ambiguous";
}
