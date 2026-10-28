import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20261027213400_phase1_staff_custom_fields_rls.sql", "utf8");
const cors = readFileSync("supabase/functions/_shared/cors.ts", "utf8");

function policyBody(name) {
  const match = migration.match(new RegExp(`CREATE POLICY ${name}\\s+ON public\\.staff([\\s\\S]*?);`, "i"));
  assert.ok(match, `Missing staff policy ${name}`);
  return match[1];
}

test("staff write policies constrain the server-resolved workspace", () => {
  for (const name of ["staff_manage_insert", "staff_manage_update", "staff_manage_delete"]) {
    const body = policyBody(name);
    assert.match(body, /TO authenticated/i);
    assert.match(body, /created_by = auth\.uid\(\)/i);
    assert.match(body, /created_by = public\.get_effective_workspace_id\(\)/i);
    assert.match(body, /has_workspace_permission\(created_by, 'manage_team'\)/i);
  }
  assert.match(policyBody("staff_manage_insert"), /WITH CHECK/i);
  assert.match(policyBody("staff_manage_update"), /WITH CHECK/i);
});

test("staff read exception is limited to platform super-admins", () => {
  assert.match(policyBody("staff_super_admin_select"), /FOR SELECT TO authenticated/i);
  assert.doesNotMatch(migration, /CREATE POLICY staff_super_admin_(insert|update|delete)/i);
});

test("custom field policies are restricted to authenticated users", () => {
  for (const name of ["Workspace members can view custom fields", "Workspace admins can manage custom fields"]) {
    assert.ok(migration.includes(`CREATE POLICY "${name}"`));
  }
  assert.match(migration, /ON public\.custom_fields FOR SELECT TO authenticated/i);
  assert.match(migration, /ON public\.custom_fields FOR ALL TO authenticated/i);
});

test("shared CORS is exact-origin and does not reflect untrusted origins", () => {
  assert.ok(cors.includes("CORS_ADDITIONAL_ORIGINS"));
  assert.ok(cors.includes("isAllowedOrigin(origin)"));
  assert.doesNotMatch(cors, /Access-Control-Allow-Origin"\s*:\s*"\*"/);
  assert.doesNotMatch(cors, /PREVIEW_PATTERNS/);
});
