import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const sql = read("supabase/migrations/20260926153000_integration_resilience_controls.sql");
const shared = read("supabase/functions/_shared/integration-resilience.ts");
const loadPlan = read("supabase/functions/load-plan-chat/index.ts");
const admin = read("src/pages/AdminPanel.tsx");

test("kill-switch scopes cover all required owner controls", () => {
  for (const scope of ["all", "provider", "company", "capability", "operation"]) {
    assert.match(sql, new RegExp(`'${scope}'`));
  }
  assert.match(sql, /integration_pre_dispatch_guard/);
  assert.match(sql, /ks\.scope = 'company'/);
  assert.match(sql, /ks\.scope = 'operation'/);
});

test("provider circuits are persistent, seeded, and half-open recovery is serialized", () => {
  for (const provider of ["gmail", "slack", "openrouter", "https"]) {
    assert.match(sql, new RegExp(`\\('${provider}'\\s*,\\s*'global'\\)`));
  }
  assert.match(sql, /state IN \('closed', 'open', 'half_open'\)/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /half_open_claimed_at/);
  assert.match(sql, /open_until/);
  assert.match(sql, /make_interval/);
  assert.match(sql, /stale success close the circuit/);
  assert.match(sql, /IF v_circuit\.state = 'open' THEN/);
});

test("dispatch wrapper checks authoritative controls before provider I/O", () => {
  const guardCall = shared.indexOf("await guardImmediatelyBeforeDispatch");
  const dispatchCall = shared.indexOf("await dispatch()");
  assert.ok(guardCall >= 0, "guard call missing");
  assert.ok(dispatchCall > guardCall, "provider dispatch must happen after the guard");
  assert.match(shared, /Fail closed/);
  assert.match(shared, /status === 429/);
  assert.match(shared, /status >= 500/);
});

test("existing outbound AI HTTPS request uses the guarded dispatch boundary", () => {
  assert.match(loadPlan, /dispatchProviderRequest/);
  assert.match(loadPlan, /provider: "https"/);
  assert.match(loadPlan, /capability: "ai\.load_plan"/);
  assert.match(loadPlan, /operation: "lovable\.chat\.completions"/);
});

test("owner UI exposes integration resilience controls", () => {
  assert.match(admin, /IntegrationResiliencePanel/);
  assert.match(admin, /value="integrations"/);
});
