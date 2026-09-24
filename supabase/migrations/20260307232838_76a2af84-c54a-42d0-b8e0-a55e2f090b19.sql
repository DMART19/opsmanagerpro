
-- Security definer function: check if current user has a workspace permission
-- This can be used in RLS policies to enforce workspace-level permissions server-side
CREATE OR REPLACE FUNCTION public.has_workspace_permission(
  _workspace_owner_id UUID,
  _permission TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _role TEXT;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN RETURN FALSE; END IF;
  
  -- Workspace owner always has full permission
  IF _user_id = _workspace_owner_id THEN RETURN TRUE; END IF;
  
  -- Get member's role
  SELECT role INTO _role
  FROM public.workspace_members
  WHERE user_id = _user_id
    AND workspace_owner_id = _workspace_owner_id
    AND status = 'active';
  
  IF _role IS NULL THEN RETURN FALSE; END IF;
  
  -- Permission matrix (mirrors frontend workspace-permissions.ts)
  RETURN CASE _role
    WHEN 'workspace_admin' THEN TRUE
    WHEN 'supervisor' THEN _permission IN (
      'view_dashboard','view_assets','create_assets','edit_assets','delete_assets',
      'view_containers','manage_containers','check_in_out',
      'view_credentials','manage_credentials','use_pallet_builder','use_calendar'
    )
    WHEN 'inventory_clerk' THEN _permission IN (
      'view_dashboard','view_assets','create_assets','edit_assets','delete_assets',
      'view_containers','manage_containers','check_in_out'
    )
    WHEN 'safety_manager' THEN _permission IN (
      'view_dashboard','view_team','view_credentials','manage_credentials','view_compliance'
    )
    WHEN 'viewer' THEN _permission IN (
      'view_dashboard','view_assets','view_team'
    )
    ELSE FALSE
  END;
END;
$$;
