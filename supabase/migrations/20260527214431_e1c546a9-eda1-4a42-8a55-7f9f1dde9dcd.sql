-- 1. Avatars ownership
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;

CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid())
WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid());

-- 2. Workspace-scoped reads for private buckets
DROP POLICY IF EXISTS "Authenticated users can view box documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view requirement documents" ON storage.objects;

CREATE POLICY "Workspace members can view box documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'box-documents' AND owner IS NOT NULL AND is_in_workspace(owner));

CREATE POLICY "Workspace members can view certificates"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'certificates' AND owner IS NOT NULL AND is_in_workspace(owner));

CREATE POLICY "Workspace members can view requirement documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'requirement-documents' AND owner IS NOT NULL AND is_in_workspace(owner));

-- 3. Audit/lineage inserts bound to acting user
DROP POLICY IF EXISTS "authenticated_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "authenticated_insert_own_audit_logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (changed_by = auth.uid());

DROP POLICY IF EXISTS "authenticated_insert_change_history" ON public.change_history;
CREATE POLICY "authenticated_insert_own_change_history"
ON public.change_history FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "system_insert_secrets_audit" ON public.secrets_audit_log;
CREATE POLICY "service_role_insert_secrets_audit"
ON public.secrets_audit_log FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "system_insert_lineage" ON public.data_lineage;
CREATE POLICY "authenticated_insert_own_lineage"
ON public.data_lineage FOR INSERT TO authenticated
WITH CHECK (performed_by = auth.uid());
CREATE POLICY "service_role_insert_lineage"
ON public.data_lineage FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert from security definer" ON public.snapshot_audit_logs;
CREATE POLICY "authenticated_insert_own_snapshot_audit"
ON public.snapshot_audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND (performed_by IS NULL OR performed_by = auth.uid()));
CREATE POLICY "service_role_insert_snapshot_audit"
ON public.snapshot_audit_logs FOR INSERT TO service_role
WITH CHECK (true);

-- 4. user_roles: block admin from granting super_admin
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Admins manage non-super roles"
ON public.user_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND role <> 'super_admin'::app_role)
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND role <> 'super_admin'::app_role);

CREATE POLICY "Super admins manage all roles"
ON public.user_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Service role manages all roles"
ON public.user_roles FOR ALL TO service_role
USING (true) WITH CHECK (true);