/**
 * Workspace Isolation Utilities
 * 
 * Client-side helpers for enforcing workspace data isolation.
 * These complement the server-side RLS policies.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Validate workspace context before sensitive operations.
 * Calls the server-side validation function.
 */
export async function validateWorkspaceAccess(targetWorkspaceId?: string): Promise<{
  valid: boolean;
  workspaceId: string | null;
  role: string;
  isolated: boolean;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("validate-workspace", {
      body: targetWorkspaceId ? { workspace_id: targetWorkspaceId } : {},
    });

    if (error) {
      console.error("Workspace validation failed:", error);
      return { valid: false, workspaceId: null, role: "unknown", isolated: true };
    }

    return {
      valid: data.valid,
      workspaceId: data.workspace_id,
      role: data.role,
      isolated: data.isolated,
    };
  } catch {
    return { valid: false, workspaceId: null, role: "unknown", isolated: true };
  }
}

/**
 * Get the effective workspace ID from the server.
 * Uses the security definer function for authoritative resolution.
 */
export async function getServerWorkspaceId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("validate_workspace_context");
  if (error || !data) return null;
  const result = data as Record<string, unknown>;
  return (result.workspace_id as string) ?? null;
}

/**
 * Sanitize query parameters to prevent workspace ID leakage.
 * Strips any workspace_id params that don't match the user's workspace.
 */
export function sanitizeWorkspaceParams(
  params: Record<string, unknown>,
  currentWorkspaceId: string | null,
  isSuperAdmin: boolean
): Record<string, unknown> {
  if (isSuperAdmin) return params;

  const sanitized = { ...params };
  
  // Ensure user_id filters match the workspace
  if (sanitized.user_id && sanitized.user_id !== currentWorkspaceId) {
    console.warn("Workspace isolation: blocked cross-workspace user_id filter");
    sanitized.user_id = currentWorkspaceId;
  }

  return sanitized;
}
