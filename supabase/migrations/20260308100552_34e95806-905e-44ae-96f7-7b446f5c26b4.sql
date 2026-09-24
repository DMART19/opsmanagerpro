
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS data_access_alerts BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_access_alerts BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS large_export_alerts BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS large_export_threshold INTEGER DEFAULT 100;
