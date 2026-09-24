
-- 1. profiles: remove broad admin read
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 2. product_events: remove broad admin read
DROP POLICY IF EXISTS "Admins can view all events" ON public.product_events;

-- 3. audit_logs: super_admin only (drop combined policy, replace)
DROP POLICY IF EXISTS super_admin_read_audit_logs ON public.audit_logs;
CREATE POLICY super_admin_read_audit_logs ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 4. deletion_requests: replace ALL policy with insert + narrow select
DROP POLICY IF EXISTS users_manage_own_deletion_requests ON public.deletion_requests;
CREATE POLICY users_insert_own_deletion_requests ON public.deletion_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY users_read_own_deletion_requests ON public.deletion_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Strip sensitive columns from user-accessible SELECT via column grants
REVOKE SELECT ON public.deletion_requests FROM authenticated;
GRANT SELECT (id, user_id, status, reason, created_at, updated_at)
  ON public.deletion_requests TO authenticated;
GRANT INSERT ON public.deletion_requests TO authenticated;

-- 5. avatars storage: enforce path ownership on insert
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6. workspace_plans: explicit restrictive deny for user updates/deletes
CREATE POLICY block_user_update_workspace_plans ON public.workspace_plans
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY block_user_delete_workspace_plans ON public.workspace_plans
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));
