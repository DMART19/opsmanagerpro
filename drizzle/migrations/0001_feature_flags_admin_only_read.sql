DROP POLICY IF EXISTS "Authenticated users can read feature flags" ON public.feature_flags;

CREATE POLICY "Super admins can read feature flags"
ON public.feature_flags
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));