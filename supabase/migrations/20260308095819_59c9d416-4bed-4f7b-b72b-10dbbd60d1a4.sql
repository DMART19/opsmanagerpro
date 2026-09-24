
-- Create append-only data access logs table
CREATE TABLE public.data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID,
  object_type TEXT NOT NULL,
  object_id TEXT,
  action_type TEXT NOT NULL DEFAULT 'view',
  source_ip INET,
  user_agent TEXT,
  page_route TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_data_access_logs_user_id ON public.data_access_logs(user_id);
CREATE INDEX idx_data_access_logs_object_type ON public.data_access_logs(object_type);
CREATE INDEX idx_data_access_logs_created_at ON public.data_access_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;

-- Append-only: authenticated users can INSERT their own logs
CREATE POLICY "users_insert_own_access_logs"
  ON public.data_access_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can read their own logs
CREATE POLICY "users_read_own_access_logs"
  ON public.data_access_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Super admins can read all logs
CREATE POLICY "admins_read_all_access_logs"
  ON public.data_access_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- No UPDATE or DELETE policies = append-only
