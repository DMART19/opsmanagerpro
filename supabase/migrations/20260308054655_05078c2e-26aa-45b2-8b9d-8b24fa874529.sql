-- RPC to archive a workspace (workspace_admin only)
CREATE OR REPLACE FUNCTION public.archive_workspace(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is the workspace owner
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: only workspace owner can archive';
  END IF;

  UPDATE workspace_plans
  SET workspace_status = 'archived',
      archived_at = now(),
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- RPC to restore a workspace from archive
CREATE OR REPLACE FUNCTION public.restore_workspace(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: only workspace owner can restore';
  END IF;

  UPDATE workspace_plans
  SET workspace_status = 'active',
      archived_at = NULL,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;