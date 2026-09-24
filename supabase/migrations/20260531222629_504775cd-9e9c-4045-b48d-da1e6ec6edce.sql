
-- 1. Prevent platform admins from escalating to admin/super_admin via user_roles
DROP POLICY IF EXISTS "Admins manage non-super roles" ON public.user_roles;
CREATE POLICY "Admins manage non-privileged roles"
ON public.user_roles
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND role NOT IN ('super_admin'::app_role, 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND role NOT IN ('super_admin'::app_role, 'admin'::app_role)
  AND user_id <> auth.uid()
);

-- 2. change_history: enforce workspace scoping on insert
DROP POLICY IF EXISTS "authenticated_insert_own_change_history" ON public.change_history;
CREATE POLICY "authenticated_insert_own_change_history"
ON public.change_history
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    workspace_id IS NULL
    OR workspace_id = public.get_effective_workspace_id()
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- 3. Storage: workspace-scoped writes for certificates, box-documents, requirement-documents
-- Folder convention: first path segment is the workspace owner's UUID.

DROP POLICY IF EXISTS "Managers and admins can upload certificates" ON storage.objects;
CREATE POLICY "Workspace members can upload certificates"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'certificates'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_in_workspace(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Managers and admins can update certificates" ON storage.objects;
CREATE POLICY "Workspace members can update certificates"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'certificates'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_in_workspace(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Managers and admins can delete certificates" ON storage.objects;
CREATE POLICY "Workspace members can delete certificates"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'certificates'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_in_workspace(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Staff and above can upload requirement documents" ON storage.objects;
CREATE POLICY "Workspace members can upload requirement documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'requirement-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_in_workspace(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Staff and above can update requirement documents" ON storage.objects;
CREATE POLICY "Workspace members can update requirement documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'requirement-documents'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_in_workspace(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Staff and above can delete requirement documents" ON storage.objects;
CREATE POLICY "Workspace members can delete requirement documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'requirement-documents'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_in_workspace(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Staff and above can upload box documents" ON storage.objects;
CREATE POLICY "Workspace members can upload box documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'box-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_in_workspace(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Staff and above can update box documents" ON storage.objects;
CREATE POLICY "Workspace members can update box documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'box-documents'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_in_workspace(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Staff and above can delete box documents" ON storage.objects;
CREATE POLICY "Workspace members can delete box documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'box-documents'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_in_workspace(((storage.foldername(name))[1])::uuid)
);

-- 4. Allow super admins to audit suppressed emails
DROP POLICY IF EXISTS "Super admins can read suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Super admins can read suppressed emails"
ON public.suppressed_emails
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));
