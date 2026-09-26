export interface ExecutionAuthorizationInput {
  companyId: string;
  portfolioId: string;
  environmentId: string;
  resourceId: string;
  planId: string;
  planVersion: number;
  approvalPlanId: string;
  approvalPlanVersion: number;
  approvalGranted: boolean;
  grantCompanyId: string;
  grantPortfolioId: string;
  grantEnvironmentId: string;
  grantResourceId: string;
  grantPlanId: string;
  grantPlanVersion: number;
  grantCapability: string;
  requestedCapability: string;
  grantExpiresAt: string;
  now: string;
  credentialCompanyId: string;
  credentialEnvironmentId: string;
  credentialCapability: string;
  killSwitchActive: boolean;
}

export interface ExecutionAuthorizationDecision {
  allowed: boolean;
  reason:
    | "allowed"
    | "approval_missing"
    | "approval_scope_mismatch"
    | "grant_expired"
    | "grant_scope_mismatch"
    | "capability_mismatch"
    | "credential_scope_mismatch"
    | "kill_switch";
}

const same = (a: string, b: string) => a.length > 0 && a === b;

export function evaluateExecutionAuthorization(
  input: ExecutionAuthorizationInput,
): ExecutionAuthorizationDecision {
  if (!input.approvalGranted) return { allowed: false, reason: "approval_missing" };

  if (
    !same(input.approvalPlanId, input.planId) ||
    input.approvalPlanVersion !== input.planVersion
  ) {
    return { allowed: false, reason: "approval_scope_mismatch" };
  }

  const expiresAt = Date.parse(input.grantExpiresAt);
  const now = Date.parse(input.now);
  if (!Number.isFinite(expiresAt) || !Number.isFinite(now) || expiresAt <= now) {
    return { allowed: false, reason: "grant_expired" };
  }

  if (
    !same(input.grantCompanyId, input.companyId) ||
    !same(input.grantPortfolioId, input.portfolioId) ||
    !same(input.grantEnvironmentId, input.environmentId) ||
    !same(input.grantResourceId, input.resourceId) ||
    !same(input.grantPlanId, input.planId) ||
    input.grantPlanVersion !== input.planVersion
  ) {
    return { allowed: false, reason: "grant_scope_mismatch" };
  }

  if (!same(input.grantCapability, input.requestedCapability)) {
    return { allowed: false, reason: "capability_mismatch" };
  }

  if (
    !same(input.credentialCompanyId, input.companyId) ||
    !same(input.credentialEnvironmentId, input.environmentId) ||
    !same(input.credentialCapability, input.requestedCapability)
  ) {
    return { allowed: false, reason: "credential_scope_mismatch" };
  }

  if (input.killSwitchActive) return { allowed: false, reason: "kill_switch" };
  return { allowed: true, reason: "allowed" };
}
