
-- 1. workspace_plans: prevent users from modifying their own billing/plan fields
DROP POLICY IF EXISTS "Users can update their own plan" ON public.workspace_plans;

-- Replace permissive INSERT with one that forces safe defaults (no plan upgrade/Stripe spoofing)
DROP POLICY IF EXISTS "Users can insert their own plan" ON public.workspace_plans;
CREATE POLICY "Users can insert their own default plan"
  ON public.workspace_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND plan = 'inventory'
    AND stripe_customer_id IS NULL
    AND stripe_subscription_id IS NULL
    AND stripe_price_id IS NULL
  );

-- 2. backup_config: fix policy that wrongly checks 'admin' instead of 'super_admin'
DROP POLICY IF EXISTS "Super admins can manage backup config" ON public.backup_config;
CREATE POLICY "Super admins can manage backup config"
  ON public.backup_config
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 3. demo_feedback: restrict admin SELECT to super_admin only
DROP POLICY IF EXISTS "Admins can view feedback" ON public.demo_feedback;
CREATE POLICY "Super admins can view feedback"
  ON public.demo_feedback
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 4. error_logs: restrict to super_admin (contains PII: emails, stack traces, replay bundles)
DROP POLICY IF EXISTS "Admins can view error logs" ON public.error_logs;
DROP POLICY IF EXISTS "Admins can update error logs" ON public.error_logs;
DROP POLICY IF EXISTS "Admins can delete error logs" ON public.error_logs;

CREATE POLICY "Super admins can view error logs"
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update error logs"
  ON public.error_logs
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete error logs"
  ON public.error_logs
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 5. security_events: explicitly block direct client inserts (legitimate writes go through
-- the log_security_event SECURITY DEFINER RPC, which bypasses RLS)
CREATE POLICY "Block direct client inserts on security events"
  ON public.security_events
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);
