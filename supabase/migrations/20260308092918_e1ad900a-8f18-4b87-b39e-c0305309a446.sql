
-- ============================================================
-- WORKSPACE DATA ISOLATION
-- ============================================================

-- 1. Security definer function: resolve the effective workspace_id
--    For workspace owners: returns their own user_id
--    For workspace members: returns the workspace_owner_id they belong to
--    For super admins: returns NULL (bypasses isolation)
CREATE OR REPLACE FUNCTION public.get_effective_workspace_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _owner_id uuid;
BEGIN
  IF _uid IS NULL THEN RETURN NULL; END IF;

  -- Super admins bypass workspace isolation
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'super_admin') THEN
    RETURN NULL;
  END IF;

  -- Check if user is a member of another workspace
  SELECT workspace_owner_id INTO _owner_id
  FROM public.workspace_members
  WHERE user_id = _uid AND status = 'active'
    AND workspace_owner_id != _uid
  LIMIT 1;

  -- If member of another workspace, return that owner; otherwise self
  RETURN COALESCE(_owner_id, _uid);
END;
$$;

-- 2. Workspace-aware access check function
--    Returns true if the given user_id (data owner) matches the caller's workspace
CREATE OR REPLACE FUNCTION public.is_in_workspace(_data_owner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _effective_ws uuid;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;

  -- Super admins can see everything
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'super_admin') THEN
    RETURN true;
  END IF;

  _effective_ws := public.get_effective_workspace_id();
  RETURN _data_owner_id = _effective_ws;
END;
$$;

-- 3. Workspace-aware access for created_by column
CREATE OR REPLACE FUNCTION public.is_in_workspace_created_by(_created_by uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN public.is_in_workspace(_created_by);
END;
$$;

-- 4. API validation function - validates workspace context and returns isolation info
CREATE OR REPLACE FUNCTION public.validate_workspace_context()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _ws_id uuid;
  _is_super boolean := false;
  _role text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check super admin
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'super_admin')
  INTO _is_super;

  _ws_id := public.get_effective_workspace_id();

  -- Get role
  IF _is_super THEN
    _role := 'super_admin';
  ELSE
    SELECT COALESCE(
      (SELECT role FROM public.workspace_members WHERE user_id = _uid AND status = 'active' LIMIT 1),
      'workspace_admin'
    ) INTO _role;
  END IF;

  RETURN jsonb_build_object(
    'user_id', _uid,
    'workspace_id', _ws_id,
    'is_super_admin', _is_super,
    'role', _role,
    'isolated', NOT _is_super
  );
END;
$$;

-- 5. Update RLS on core tables to use workspace isolation
-- employees table
DROP POLICY IF EXISTS "Users can view own employees" ON employees;
DROP POLICY IF EXISTS "Users can insert own employees" ON employees;
DROP POLICY IF EXISTS "Users can update own employees" ON employees;
DROP POLICY IF EXISTS "Users can delete own employees" ON employees;

CREATE POLICY "workspace_select_employees" ON employees
  FOR SELECT TO authenticated
  USING (public.is_in_workspace(user_id));

CREATE POLICY "workspace_insert_employees" ON employees
  FOR INSERT TO authenticated
  WITH CHECK (public.is_in_workspace(user_id));

CREATE POLICY "workspace_update_employees" ON employees
  FOR UPDATE TO authenticated
  USING (public.is_in_workspace(user_id));

CREATE POLICY "workspace_delete_employees" ON employees
  FOR DELETE TO authenticated
  USING (public.is_in_workspace(user_id));

-- cache_inventory table
DROP POLICY IF EXISTS "Users can view own inventory" ON cache_inventory;
DROP POLICY IF EXISTS "Users can insert own inventory" ON cache_inventory;
DROP POLICY IF EXISTS "Users can update own inventory" ON cache_inventory;
DROP POLICY IF EXISTS "Users can delete own inventory" ON cache_inventory;

CREATE POLICY "workspace_select_inventory" ON cache_inventory
  FOR SELECT TO authenticated
  USING (public.is_in_workspace(user_id));

CREATE POLICY "workspace_insert_inventory" ON cache_inventory
  FOR INSERT TO authenticated
  WITH CHECK (public.is_in_workspace(user_id));

CREATE POLICY "workspace_update_inventory" ON cache_inventory
  FOR UPDATE TO authenticated
  USING (public.is_in_workspace(user_id));

CREATE POLICY "workspace_delete_inventory" ON cache_inventory
  FOR DELETE TO authenticated
  USING (public.is_in_workspace(user_id));

-- employee_requirements table
DROP POLICY IF EXISTS "Users can view own employee_requirements" ON employee_requirements;
DROP POLICY IF EXISTS "Users can insert own employee_requirements" ON employee_requirements;
DROP POLICY IF EXISTS "Users can update own employee_requirements" ON employee_requirements;
DROP POLICY IF EXISTS "Users can delete own employee_requirements" ON employee_requirements;

CREATE POLICY "workspace_select_emp_reqs" ON employee_requirements
  FOR SELECT TO authenticated
  USING (public.is_in_workspace(user_id));

CREATE POLICY "workspace_insert_emp_reqs" ON employee_requirements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_in_workspace(user_id));

CREATE POLICY "workspace_update_emp_reqs" ON employee_requirements
  FOR UPDATE TO authenticated
  USING (public.is_in_workspace(user_id));

CREATE POLICY "workspace_delete_emp_reqs" ON employee_requirements
  FOR DELETE TO authenticated
  USING (public.is_in_workspace(user_id));

-- departments table
DROP POLICY IF EXISTS "Users can view own departments" ON departments;
DROP POLICY IF EXISTS "Users can insert own departments" ON departments;
DROP POLICY IF EXISTS "Users can update own departments" ON departments;
DROP POLICY IF EXISTS "Users can delete own departments" ON departments;

CREATE POLICY "workspace_select_departments" ON departments
  FOR SELECT TO authenticated
  USING (public.is_in_workspace(user_id));

CREATE POLICY "workspace_insert_departments" ON departments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_in_workspace(user_id));

CREATE POLICY "workspace_update_departments" ON departments
  FOR UPDATE TO authenticated
  USING (public.is_in_workspace(user_id));

CREATE POLICY "workspace_delete_departments" ON departments
  FOR DELETE TO authenticated
  USING (public.is_in_workspace(user_id));

-- team_roles table
DROP POLICY IF EXISTS "Users can view own team_roles" ON team_roles;
DROP POLICY IF EXISTS "Users can insert own team_roles" ON team_roles;
DROP POLICY IF EXISTS "Users can update own team_roles" ON team_roles;
DROP POLICY IF EXISTS "Users can delete own team_roles" ON team_roles;

CREATE POLICY "workspace_select_team_roles" ON team_roles
  FOR SELECT TO authenticated
  USING (public.is_in_workspace(user_id));

CREATE POLICY "workspace_insert_team_roles" ON team_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_in_workspace(user_id));

CREATE POLICY "workspace_update_team_roles" ON team_roles
  FOR UPDATE TO authenticated
  USING (public.is_in_workspace(user_id));

CREATE POLICY "workspace_delete_team_roles" ON team_roles
  FOR DELETE TO authenticated
  USING (public.is_in_workspace(user_id));

-- requirement_definitions table
DROP POLICY IF EXISTS "Users can view own requirements" ON requirement_definitions;
DROP POLICY IF EXISTS "Users can insert own requirements" ON requirement_definitions;
DROP POLICY IF EXISTS "Users can update own requirements" ON requirement_definitions;
DROP POLICY IF EXISTS "Users can delete own requirements" ON requirement_definitions;

CREATE POLICY "workspace_select_req_defs" ON requirement_definitions
  FOR SELECT TO authenticated
  USING (public.is_in_workspace(user_id));

CREATE POLICY "workspace_insert_req_defs" ON requirement_definitions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_in_workspace(user_id));

CREATE POLICY "workspace_update_req_defs" ON requirement_definitions
  FOR UPDATE TO authenticated
  USING (public.is_in_workspace(user_id));

CREATE POLICY "workspace_delete_req_defs" ON requirement_definitions
  FOR DELETE TO authenticated
  USING (public.is_in_workspace(user_id));

-- Index for performance on workspace_members lookups
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_active 
  ON workspace_members(user_id, status) WHERE status = 'active';
