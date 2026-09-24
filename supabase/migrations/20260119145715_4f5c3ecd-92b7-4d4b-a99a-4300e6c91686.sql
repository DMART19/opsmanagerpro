-- Fix 1: Audit logs - restrict INSERT to only allow entries where changed_by matches auth.uid()
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "Users can insert own audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (changed_by = auth.uid());

-- Fix 2: Warehouses - restrict to managers and admins only
DROP POLICY IF EXISTS "Warehouses viewable by all authenticated users" ON public.warehouses;

CREATE POLICY "Managers and admins can view warehouses"
ON public.warehouses FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR 
  public.has_role(auth.uid(), 'manager'::public.app_role)
);

-- Fix 3: Update storage policies to explicitly require authentication (not anonymous)
-- Drop and recreate storage policies to ensure they don't allow anonymous access

-- Certificates bucket policies
DROP POLICY IF EXISTS "Authenticated users can view certificates" ON storage.objects;
DROP POLICY IF EXISTS "Managers and admins can delete certificates" ON storage.objects;
DROP POLICY IF EXISTS "Managers and admins can update certificates" ON storage.objects;
DROP POLICY IF EXISTS "Managers and admins can upload certificates" ON storage.objects;

CREATE POLICY "Authenticated users can view certificates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'certificates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Managers and admins can upload certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certificates' AND
  auth.uid() IS NOT NULL AND
  (public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "Managers and admins can update certificates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'certificates' AND
  auth.uid() IS NOT NULL AND
  (public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "Managers and admins can delete certificates"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'certificates' AND
  auth.uid() IS NOT NULL AND
  (public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

-- Requirement documents bucket policies
DROP POLICY IF EXISTS "Authenticated users can view requirement documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff and above can upload requirement documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff and above can update requirement documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff and above can delete requirement documents" ON storage.objects;

CREATE POLICY "Authenticated users can view requirement documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'requirement-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Staff and above can upload requirement documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'requirement-documents' AND
  auth.uid() IS NOT NULL AND
  (public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "Staff and above can update requirement documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'requirement-documents' AND
  auth.uid() IS NOT NULL AND
  (public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "Staff and above can delete requirement documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'requirement-documents' AND
  auth.uid() IS NOT NULL AND
  (public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

-- Box documents bucket policies
DROP POLICY IF EXISTS "Authenticated users can view box documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff and above can upload box documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff and above can update box documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff and above can delete box documents" ON storage.objects;

CREATE POLICY "Authenticated users can view box documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'box-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Staff and above can upload box documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'box-documents' AND
  auth.uid() IS NOT NULL AND
  (public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "Staff and above can update box documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'box-documents' AND
  auth.uid() IS NOT NULL AND
  (public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "Staff and above can delete box documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'box-documents' AND
  auth.uid() IS NOT NULL AND
  (public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);