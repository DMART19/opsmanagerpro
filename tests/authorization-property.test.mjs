import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateExecutionAuthorization,
} from "../src/domain/execution/authorization-core.ts";

const base = {
  companyId: "company-a",
  portfolioId: "portfolio-a",
  environmentId: "prod",
  resourceId: "resource-a",
  planId: "plan-a",
  planVersion: 7,
  approvalPlanId: "plan-a",
  approvalPlanVersion: 7,
  approvalGranted: true,
  grantCompanyId: "company-a",
  grantPortfolioId: "portfolio-a",
  grantEnvironmentId: "prod",
  grantResourceId: "resource-a",
  grantPlanId: "plan-a",
  grantPlanVersion: 7,
  grantCapability: "inventory.write",
  requestedCapability: "inventory.write",
  grantExpiresAt: "2030-01-01T00:00:00.000Z",
  now: "2026-09-26T00:00:00.000Z",
  credentialCompanyId: "company-a",
  credentialEnvironmentId: "prod",
  credentialCapability: "inventory.write",
  killSwitchActive: false,
};

const mutations = [
  ["company", { companyId: "company-b" }],
  ["portfolio", { portfolioId: "portfolio-b" }],
  ["environment", { environmentId: "staging" }],
  ["resource", { resourceId: "resource-b" }],
  ["plan version", { planVersion: 8 }],
  ["approval", { approvalGranted: false }],
  ["approval plan", { approvalPlanId: "plan-b" }],
  ["approval version", { approvalPlanVersion: 8 }],
  ["grant expiry", { grantExpiresAt: "2020-01-01T00:00:00.000Z" }],
  ["capability", { requestedCapability: "billing.write" }],
  ["kill switch", { killSwitchActive: true }],
  ["credential company", { credentialCompanyId: "company-b" }],
  ["credential environment", { credentialEnvironmentId: "staging" }],
  ["credential capability", { credentialCapability: "billing.write" }],
];

test("fully bound authorization reaches execution", () => {
  assert.deepEqual(evaluateExecutionAuthorization(base), { allowed: true, reason: "allowed" });
});

test("every single authorization dimension fails closed when mismatched", () => {
  for (const [label, mutation] of mutations) {
    const decision = evaluateExecutionAuthorization({ ...base, ...mutation });
    assert.equal(decision.allowed, false, `${label} mismatch unexpectedly authorized`);
  }
});

test("property sweep: large cross-product of scope mutations never authorizes an invalid combination", () => {
  const dimensions = [
    ["companyId", ["company-a", "company-b"]],
    ["portfolioId", ["portfolio-a", "portfolio-b"]],
    ["environmentId", ["prod", "staging"]],
    ["resourceId", ["resource-a", "resource-b"]],
    ["planVersion", [7, 8]],
    ["approvalGranted", [true, false]],
    ["approvalPlanVersion", [7, 8]],
    ["grantExpiresAt", ["2030-01-01T00:00:00.000Z", "2020-01-01T00:00:00.000Z"]],
    ["requestedCapability", ["inventory.write", "billing.write"]],
    ["killSwitchActive", [false, true]],
    ["credentialCompanyId", ["company-a", "company-b"]],
    ["credentialEnvironmentId", ["prod", "staging"]],
    ["credentialCapability", ["inventory.write", "billing.write"]],
  ];

  let cases = 0;
  let authorized = 0;

  const visit = (index, candidate) => {
    if (index === dimensions.length) {
      cases += 1;
      const decision = evaluateExecutionAuthorization(candidate);
      if (decision.allowed) {
        authorized += 1;
        assert.equal(candidate.companyId, "company-a");
        assert.equal(candidate.portfolioId, "portfolio-a");
        assert.equal(candidate.environmentId, "prod");
        assert.equal(candidate.resourceId, "resource-a");
        assert.equal(candidate.planVersion, 7);
        assert.equal(candidate.approvalGranted, true);
        assert.equal(candidate.approvalPlanVersion, 7);
        assert.equal(candidate.grantExpiresAt, "2030-01-01T00:00:00.000Z");
        assert.equal(candidate.requestedCapability, "inventory.write");
        assert.equal(candidate.killSwitchActive, false);
        assert.equal(candidate.credentialCompanyId, "company-a");
        assert.equal(candidate.credentialEnvironmentId, "prod");
        assert.equal(candidate.credentialCapability, "inventory.write");
      }
      return;
    }
    const [key, values] = dimensions[index];
    for (const value of values) visit(index + 1, { ...candidate, [key]: value });
  };

  visit(0, { ...base });
  assert.equal(cases, 8192);
  assert.equal(authorized, 1, "only the fully bound valid combination may authorize");
});
