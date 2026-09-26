import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryConsequentialExecutionStore,
  executeConsequentialOperation,
  reconcileAmbiguousOperation,
} from "../src/domain/execution/idempotency-core.ts";

test("chaos: 256 concurrent workers dispatch the same consequential side effect at most once", async () => {
  const store = new InMemoryConsequentialExecutionStore();
  let dispatches = 0;

  const workers = Array.from({ length: 256 }, async (_, worker) => {
    await new Promise((resolve) => setTimeout(resolve, worker % 7));
    return executeConsequentialOperation(store, "same-authorized-operation", async (requestId) => {
      dispatches += 1;
      assert.equal(requestId, "same-authorized-operation");
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { kind: "success" };
    });
  });

  const results = await Promise.all(workers);
  assert.equal(dispatches, 1);
  assert.equal(results.filter((x) => x === "dispatched").length, 1);
});

test("ambiguous provider timeout never blindly redispatches and reconciles by provider request id", async () => {
  const store = new InMemoryConsequentialExecutionStore();
  let dispatches = 0;

  const first = await executeConsequentialOperation(store, "ambiguous-op", async () => {
    dispatches += 1;
    throw new Error("connection_lost_after_write");
  });
  assert.equal(first, "ambiguous");

  const retry = await executeConsequentialOperation(store, "ambiguous-op", async () => {
    dispatches += 1;
    return { kind: "success" };
  });
  assert.equal(retry, "ambiguous");
  assert.equal(dispatches, 1, "ambiguous outcome must not be blindly re-dispatched");

  const reconciled = await reconcileAmbiguousOperation(
    store,
    "ambiguous-op",
    async (providerRequestId) => {
      assert.equal(providerRequestId, "ambiguous-op");
      return "succeeded";
    },
  );
  assert.equal(reconciled, "succeeded");
  assert.equal((await store.get("ambiguous-op"))?.state, "succeeded");
});

test("provider not-found reconciliation makes a future explicit retry safe without claiming success", async () => {
  const store = new InMemoryConsequentialExecutionStore();
  await executeConsequentialOperation(store, "not-found-op", async () => ({ kind: "ambiguous" }));
  const reconciled = await reconcileAmbiguousOperation(store, "not-found-op", async () => "not_found");
  assert.equal(reconciled, "retry_safe");
  assert.equal((await store.get("not-found-op"))?.state, "failed");
});
