import { supabase } from "@/integrations/supabase/client";

/**
 * Creates a snapshot before a large destructive action.
 * Call this before bulk deletions, workspace archives, etc.
 */
export const createPreActionSnapshot = async (actionLabel: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.rpc("create_workspace_snapshot" as any, {
      p_user_id: user.id,
      p_name: `Before: ${actionLabel}`,
      p_snapshot_type: "pre_action",
    });

    if (error) {
      console.error("Pre-action snapshot failed:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Pre-action snapshot error:", err);
    return false;
  }
};
