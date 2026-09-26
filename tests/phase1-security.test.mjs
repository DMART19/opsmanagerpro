import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("shared CORS helper has no wildcard and rejects unapproved origins", () => {
  const source = read("supabase/functions/_shared/cors.ts");
  assert.doesNotMatch(source, /Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/);
  assert.match(source, /rejectDisallowedOrigin/);
  assert.match(source, /isAllowedOrigin/);
});

test("AI endpoint requires workspace and blocks PHI", () => {
  const source = read("supabase/functions/load-plan-chat/index.ts");
  assert.match(source, /workspace_id: z\.string\(\)\.uuid\(\)/);
  assert.match(source, /contains_phi/);
  assert.match(source, /AI features are unavailable for this workspace/);
  assert.doesNotMatch(source, /role: z\.enum\(\[.*system/);
});

test("classification defaults to non-PHI and direct updates are revoked", () => {
  const source = read("supabase/migrations/20260926120000_phase1_data_flow_controls.sql");
  assert.match(source, /contains_phi boolean NOT NULL DEFAULT false/);
  assert.match(source, /REVOKE UPDATE \(contains_phi\)/);
  assert.match(source, /SECURITY DEFINER/);
  assert.match(source, /auth\.uid\(\) <> p_workspace_id/);
});

test("synthetic security fixtures contain no PHI", () => {
  const source = read("tests/phase1-security.test.mjs");
  assert.doesNotMatch(source, /patient|diagnosis|medical record|ssn/i);
});
