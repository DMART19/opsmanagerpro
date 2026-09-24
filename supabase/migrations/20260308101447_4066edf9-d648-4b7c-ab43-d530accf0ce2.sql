
-- Fix ambiguous user_id references in admin RPC functions
-- The RETURNS TABLE declares user_id as output column, conflicting with user_roles.user_id

CREATE OR REPLACE FUNCTION public.admin_list_workspace_snapshots(p_admin_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  workspace_name text,
  user_email text,
  name text,
  created_at timestamptz,
  snapshot_type text,
  snapshot_size int,
  asset_count int,
  container_count int,
  employee_count int,
  task_count int,
  pallet_count int,
  credential_count int,
  storage_area_count int
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is super_admin (qualify with table name to avoid ambiguity)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_admin_id AND ur.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: super_admin role required';
  END IF;

  RETURN QUERY
  SELECT
    ws.id,
    ws.user_id,
    COALESCE(wset.workspace_name, 'Unnamed Workspace')::text AS workspace_name,
    COALESCE(p.email, '')::text AS user_email,
    ws.name,
    ws.created_at,
    ws.snapshot_type,
    ws.snapshot_size,
    ws.asset_count,
    ws.container_count,
    ws.employee_count,
    ws.task_count,
    ws.pallet_count,
    ws.credential_count,
    ws.storage_area_count
  FROM workspace_snapshots ws
  LEFT JOIN workspace_settings wset ON wset.user_id = ws.user_id
  LEFT JOIN profiles p ON p.id = ws.user_id
  ORDER BY ws.created_at DESC;
END;
$$;

-- Fix admin_restore_workspace_snapshot
CREATE OR REPLACE FUNCTION public.admin_restore_workspace_snapshot(
  p_admin_id uuid,
  p_snapshot_id uuid,
  p_restore_mode text DEFAULT 'full',
  p_categories text[] DEFAULT ARRAY['assets','containers','employees','tasks']
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_target_user_id uuid;
BEGIN
  -- Verify caller is super_admin (qualify with table alias)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_admin_id AND ur.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: super_admin role required';
  END IF;

  -- Get the snapshot's owner
  SELECT ws.user_id INTO v_target_user_id
  FROM workspace_snapshots ws
  WHERE ws.id = p_snapshot_id;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Snapshot not found';
  END IF;

  -- Delegate to the existing restore function
  RETURN restore_workspace_snapshot(v_target_user_id, p_snapshot_id, p_restore_mode, p_categories);
END;
$$;

-- Fix admin_create_workspace_snapshot
CREATE OR REPLACE FUNCTION public.admin_create_workspace_snapshot(
  p_admin_id uuid,
  p_target_user_id uuid,
  p_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is super_admin (qualify with table alias)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_admin_id AND ur.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: super_admin role required';
  END IF;

  RETURN create_workspace_snapshot(p_target_user_id, p_name, 'manual');
END;
$$;
