-- Phase 1 / P0: staff PII tenant-isolation and custom-field policy scope.
-- Staging-first. Review pg_policies before applying to an existing project.
-- Staff writes must target the caller's server-resolved effective workspace,
-- or the caller's own workspace. Merely naming a workspace owner in
-- client-controlled created_by is not an authorization grant.
BEGIN;

-- Fail closed if deployment contains an unknown staff policy; PostgreSQL
-- combines permissive RLS policies using OR, which could undo this fix.
DO $guard$
DECLARE unexpected text;
BEGIN
  SELECT string_agg(policyname, ', ' ORDER BY policyname)
    INTO unexpected
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'staff'
     AND policyname NOT IN (
       'staff_view_team', 'staff_super_admin_select',
       'staff_manage_insert', 'staff_manage_update', 'staff_manage_delete',
       'workspace_manage_staff',
       'Staff viewable by all authenticated users',
       'Managers and admins can view all staff',
       'Managers and admins can manage staff',
       'Staff can view own record',
       'Users can view own workspace staff'
     );
  IF unexpected IS NOT NULL THEN
    RAISE EXCEPTION 'Unreviewed staff RLS policies: %', unexpected;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'staff' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'staff RLS must be enabled';
  END IF;
END $guard$;

DROP POLICY IF EXISTS staff_view_team ON public.staff;
DROP POLICY IF EXISTS staff_super_admin_select ON public.staff;
DROP POLICY IF EXISTS staff_manage_insert ON public.staff;
DROP POLICY IF EXISTS staff_manage_update ON public.staff;
DROP POLICY IF EXISTS staff_manage_delete ON public.staff;
DROP POLICY IF EXISTS workspace_manage_staff ON public.staff;
DROP POLICY IF EXISTS "Staff viewable by all authenticated users" ON public.staff;
DROP POLICY IF EXISTS "Managers and admins can view all staff" ON public.staff;
DROP POLICY IF EXISTS "Managers and admins can manage staff" ON public.staff;
DROP POLICY IF EXISTS "Staff can view own record" ON public.staff;
DROP POLICY IF EXISTS "Users can view own workspace staff" ON public.staff;

-- SELECT access: caller's effective workspace with view_team permission.
-- The existing super-admin read exception is preserved, not write privileges.
CREATE POLICY staff_view_team ON public.staff
  FOR SELECT TO authenticated
  USING (
    (created_by = auth.uid() OR created_by = public.get_effective_workspace_id())
    AND public.has_workspace_permission(created_by, 'view_team')
  );
CREATE POLICY staff_super_admin_select ON public.staff
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY staff_manage_insert ON public.staff
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by IS NOT NULL
    AND (created_by = auth.uid() OR created_by = public.get_effective_workspace_id())
    AND public.has_workspace_permission(created_by, 'manage_team')
  );

CREATE POLICY staff_manage_update ON public.staff
  FOR UPDATE TO authenticated
  USING (
    (created_by = auth.uid() OR created_by = public.get_effective_workspace_id())
    AND public.has_workspace_permission(created_by, 'manage_team')
  )
  WITH CHECK (
    created_by IS NOT NULL
    AND (created_by = auth.uid() OR created_by = public.get_effective_workspace_id())
    AND public.has_workspace_permission(created_by, 'manage_team')
  );

CREATE POLICY staff_manage_delete ON public.staff
  FOR DELETE TO authenticated
  USING (
    (created_by = auth.uid() OR created_by = public.get_effective_workspace_id())
    AND public.has_workspace_permission(created_by, 'manage_team')
  );

-- The two current custom_fields policies omitted TO authenticated.
-- Preserve existing functional predicates and add explicit role scoping.
DROP POLICY IF EXISTS "Workspace members can view custom fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Workspace admins can manage custom fields" ON public.custom_fields;
CREATE POLICY "Workspace members can view custom fields"
  ON public.custom_fields FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_in_workspace(created_by)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );
CREATE POLICY "Workspace admins can manage custom fields"
  ON public.custom_fields FOR ALL TO authenticated
  USING (
    (public.is_in_workspace(created_by)
      AND public.has_workspace_permission(created_by, 'manage_custom_fields'))
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    (public.is_in_workspace(created_by)
      AND public.has_workspace_permission(created_by, 'manage_custom_fields'))
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );
COMMIT;
