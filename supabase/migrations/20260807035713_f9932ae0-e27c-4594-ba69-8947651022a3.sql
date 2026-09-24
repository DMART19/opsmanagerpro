-- 1. cache_inventory: drop redundant broad is_in_workspace policies
DROP POLICY IF EXISTS "workspace_select_inventory" ON public.cache_inventory;
DROP POLICY IF EXISTS "workspace_insert_inventory" ON public.cache_inventory;
DROP POLICY IF EXISTS "workspace_update_inventory" ON public.cache_inventory;
DROP POLICY IF EXISTS "workspace_delete_inventory" ON public.cache_inventory;

-- 2. user_roles: also block admins from touching their own role rows on read/modify path
DROP POLICY IF EXISTS "Admins manage non-privileged roles" ON public.user_roles;
CREATE POLICY "Admins manage non-privileged roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND role <> ALL (ARRAY['super_admin'::app_role, 'admin'::app_role])
  AND user_id <> auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND role <> ALL (ARRAY['super_admin'::app_role, 'admin'::app_role])
  AND user_id <> auth.uid()
);

-- 3. workspace_invites: no direct anon table access; lookups go through security-definer functions
REVOKE ALL ON public.workspace_invites FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_invites TO authenticated;
GRANT ALL ON public.workspace_invites TO service_role;