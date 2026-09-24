
-- 1. database_integrity_log: restrict to super_admin
DROP POLICY IF EXISTS "Service role full access" ON public.database_integrity_log;
CREATE POLICY "Super admins can manage integrity log"
  ON public.database_integrity_log
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 2. performance_metrics: self-only SELECT (super_admin bypass)
DROP POLICY IF EXISTS "Authenticated users can read performance metrics" ON public.performance_metrics;
CREATE POLICY "Users read own performance metrics"
  ON public.performance_metrics
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role));

-- 3. workspace_feature_flags: limit SELECT to user's workspace
DROP POLICY IF EXISTS "Users can read own workspace feature flags" ON public.workspace_feature_flags;
CREATE POLICY "Users read own workspace feature flags"
  ON public.workspace_feature_flags
  FOR SELECT
  TO authenticated
  USING (
    public.is_in_workspace(workspace_id)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 4. workspace_invites: remove blank-email bypass
DROP POLICY IF EXISTS "Users can read pending invites by email or token" ON public.workspace_invites;
CREATE POLICY "Users read invites addressed to them"
  ON public.workspace_invites
  FOR SELECT
  TO authenticated
  USING (
    workspace_owner_id = auth.uid()
    OR (
      status = 'pending'
      AND email IS NOT NULL
      AND email <> ''
      AND lower(email) = lower(get_auth_email(auth.uid()))
    )
  );
