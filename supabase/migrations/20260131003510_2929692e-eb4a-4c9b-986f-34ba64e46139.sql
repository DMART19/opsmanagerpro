-- Create workspace_settings table to store organization-level settings
CREATE TABLE public.workspace_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_name TEXT DEFAULT 'OpsManagerPro',
  timezone TEXT DEFAULT 'America/New_York',
  date_format TEXT DEFAULT 'MM/dd/yyyy',
  time_format TEXT DEFAULT '12',
  measurement_unit TEXT DEFAULT 'imperial',
  default_view TEXT DEFAULT 'dashboard',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Create notification_settings table for per-user notification preferences
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  checkout_alerts BOOLEAN DEFAULT true,
  maintenance_alerts BOOLEAN DEFAULT true,
  certification_expiry_alerts BOOLEAN DEFAULT true,
  compliance_alerts BOOLEAN DEFAULT true,
  task_due_alerts BOOLEAN DEFAULT true,
  audit_reminders BOOLEAN DEFAULT true,
  expiry_warning_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Create asset_settings table for inventory behavior configuration
CREATE TABLE public.asset_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  default_categories TEXT[] DEFAULT ARRAY['Equipment', 'Electronics', 'Furniture', 'AV Equipment', 'Office Supplies']::TEXT[],
  status_options TEXT[] DEFAULT ARRAY['Available', 'In Use', 'Service', 'Retired', 'Lost']::TEXT[],
  group_duplicates BOOLEAN DEFAULT true,
  auto_generate_asset_tags BOOLEAN DEFAULT true,
  require_checkout_notes BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Create compliance_settings table for credential/certification thresholds
CREATE TABLE public.compliance_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  warning_threshold_days INTEGER DEFAULT 30,
  critical_threshold_days INTEGER DEFAULT 7,
  expired_severity TEXT DEFAULT 'critical',
  expiring_soon_severity TEXT DEFAULT 'warning',
  missing_credential_severity TEXT DEFAULT 'medium',
  auto_notify_expiring BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Create export_settings table for data export preferences
CREATE TABLE public.export_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  default_format TEXT DEFAULT 'csv',
  include_headers BOOLEAN DEFAULT true,
  date_range_default TEXT DEFAULT '30days',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable RLS on all settings tables
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace_settings
CREATE POLICY "Users can view their own workspace settings" 
ON public.workspace_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workspace settings" 
ON public.workspace_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workspace settings" 
ON public.workspace_settings FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for notification_settings
CREATE POLICY "Users can view their own notification settings" 
ON public.notification_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" 
ON public.notification_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" 
ON public.notification_settings FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for asset_settings
CREATE POLICY "Users can view their own asset settings" 
ON public.asset_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own asset settings" 
ON public.asset_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own asset settings" 
ON public.asset_settings FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for compliance_settings
CREATE POLICY "Users can view their own compliance settings" 
ON public.compliance_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own compliance settings" 
ON public.compliance_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compliance settings" 
ON public.compliance_settings FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for export_settings
CREATE POLICY "Users can view their own export settings" 
ON public.export_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own export settings" 
ON public.export_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own export settings" 
ON public.export_settings FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at triggers for all settings tables
CREATE TRIGGER update_workspace_settings_updated_at
BEFORE UPDATE ON public.workspace_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asset_settings_updated_at
BEFORE UPDATE ON public.asset_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_settings_updated_at
BEFORE UPDATE ON public.compliance_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_export_settings_updated_at
BEFORE UPDATE ON public.export_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();