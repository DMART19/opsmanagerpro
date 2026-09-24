DROP POLICY IF EXISTS workspace_manage_staff ON public.staff;

CREATE POLICY staff_view_team ON public.staff
  FOR SELECT TO authenticated
  USING (public.has_workspace_permission(created_by, 'view_team'));

CREATE POLICY staff_super_admin_select ON public.staff
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY staff_manage_insert ON public.staff
  FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_permission(created_by, 'manage_team'));

CREATE POLICY staff_manage_update ON public.staff
  FOR UPDATE TO authenticated
  USING (public.has_workspace_permission(created_by, 'manage_team'))
  WITH CHECK (public.has_workspace_permission(created_by, 'manage_team'));

CREATE POLICY staff_manage_delete ON public.staff
  FOR DELETE TO authenticated
  USING (public.has_workspace_permission(created_by, 'manage_team'));