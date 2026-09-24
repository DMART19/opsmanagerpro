
-- Add default notification_settings creation to the handle_new_user function
-- by creating a separate trigger that fires after user profile creation

CREATE OR REPLACE FUNCTION public.create_default_notification_settings()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notification_settings (
    user_id,
    in_app_enabled,
    email_enabled,
    checkout_alerts,
    maintenance_alerts,
    certification_expiry_alerts,
    task_due_alerts,
    expiry_warning_days
  ) VALUES (
    NEW.id,
    true,
    true,
    true,
    true,
    true,
    true,
    30
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Attach trigger to profiles table (created by handle_new_user)
CREATE TRIGGER create_default_notification_settings_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_settings();
