
CREATE TABLE public.backup_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  frequency text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('hourly', 'daily', 'weekly')),
  retention_days integer NOT NULL DEFAULT 30 CHECK (retention_days IN (7, 30, 90)),
  snapshot_strategy text NOT NULL DEFAULT 'full' CHECK (snapshot_strategy IN ('full', 'incremental')),
  storage_location text NOT NULL DEFAULT 'platform_managed' CHECK (storage_location IN ('platform_managed', 'external')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.backup_config ENABLE ROW LEVEL SECURITY;

-- Only super admins can read/write backup config
CREATE POLICY "Super admins can manage backup config"
  ON public.backup_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Insert default config row
INSERT INTO public.backup_config (frequency, retention_days, snapshot_strategy, storage_location)
VALUES ('daily', 30, 'full', 'platform_managed');
