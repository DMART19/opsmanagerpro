// Shared plan-tier entitlement helper for edge functions.
// Uses the service role to read workspace_plans without RLS interference,
// then compares the workspace tier to a required minimum.

import { createClient } from "npm:@supabase/supabase-js@2";

export type PlanTier = "inventory" | "operations" | "operations_pro" | "enterprise";

const TIER_ORDER: Record<PlanTier, number> = {
  inventory: 0,
  operations: 1,
  operations_pro: 2,
  enterprise: 3,
};

let adminClient: ReturnType<typeof createClient> | null = null;
function getAdmin() {
  if (adminClient) return adminClient;
  adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  return adminClient;
}

export interface EntitlementResult {
  allowed: boolean;
  plan: PlanTier | null;
  workspaceStatus: string | null;
  isSuperAdmin: boolean;
  reason?: "no_plan" | "insufficient_tier" | "workspace_locked";
}

/**
 * Verify a user's workspace meets a minimum plan tier.
 * Super admins always pass. Read-only / archived workspaces are denied.
 */
export async function checkEntitlement(
  userId: string,
  requiredTier: PlanTier,
): Promise<EntitlementResult> {
  const admin = getAdmin();

  // Super-admin bypass
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const isSuperAdmin = !!roles?.some((r: any) => r.role === "super_admin");
  if (isSuperAdmin) {
    return { allowed: true, plan: "enterprise", workspaceStatus: "active", isSuperAdmin: true };
  }

  // Resolve the workspace this user belongs to (owner or member).
  let ownerId: string | null = null;
  const { data: ownedPlan } = await admin
    .from("workspace_plans")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (ownedPlan) {
    ownerId = ownedPlan.user_id as string;
  } else {
    const { data: membership } = await admin
      .from("workspace_members")
      .select("workspace_owner_id")
      .eq("user_id", userId)
      .maybeSingle();
    ownerId = (membership?.workspace_owner_id as string | undefined) ?? null;
  }

  if (!ownerId) {
    return { allowed: false, plan: null, workspaceStatus: null, isSuperAdmin: false, reason: "no_plan" };
  }

  const { data: plan } = await admin
    .from("workspace_plans")
    .select("plan, workspace_status")
    .eq("user_id", ownerId)
    .maybeSingle();

  if (!plan) {
    return { allowed: false, plan: null, workspaceStatus: null, isSuperAdmin: false, reason: "no_plan" };
  }

  const planId = plan.plan as PlanTier;
  const status = plan.workspace_status as string;

  if (status === "read_only" || status === "archived") {
    return { allowed: false, plan: planId, workspaceStatus: status, isSuperAdmin: false, reason: "workspace_locked" };
  }

  const has = (TIER_ORDER[planId] ?? -1) >= TIER_ORDER[requiredTier];
  return {
    allowed: has,
    plan: planId,
    workspaceStatus: status,
    isSuperAdmin: false,
    reason: has ? undefined : "insufficient_tier",
  };
}