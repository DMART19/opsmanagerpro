
-- Add admin access transparency columns to data_access_logs
ALTER TABLE public.data_access_logs
  ADD COLUMN IF NOT EXISTS admin_user_id UUID,
  ADD COLUMN IF NOT EXISTS admin_email TEXT,
  ADD COLUMN IF NOT EXISTS access_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_admin_access BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering admin access events
CREATE INDEX idx_data_access_logs_admin ON public.data_access_logs(is_admin_access) WHERE is_admin_access = true;

-- Allow super_admins to insert logs on behalf of workspace owners
CREATE POLICY "admins_insert_access_logs"
  ON public.data_access_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );
