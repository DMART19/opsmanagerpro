
-- Add trial tracking columns to workspace_plans
ALTER TABLE public.workspace_plans 
  ADD COLUMN IF NOT EXISTS trial_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end_date timestamptz;

-- Update handle_new_user to set trial fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  default_warehouse_id uuid;
BEGIN
  -- Create profile (idempotent)
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;

  -- Auto-create workspace plan: Inventory tier, trial status, 14-day trial
  INSERT INTO public.workspace_plans (
    user_id, plan, status, max_assets, max_team_members, 
    workspace_status, trial_start_date, trial_end_date
  )
  VALUES (
    new.id, 'inventory', 'trial', 1000, 5, 
    'active', now(), now() + interval '14 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Auto-create workspace settings with trial dates
  INSERT INTO public.workspace_settings (user_id, subscription_status, trial_started_at, trial_ends_at)
  VALUES (new.id, 'trialing', now(), now() + interval '14 days')
  ON CONFLICT (user_id) DO NOTHING;

  -- Auto-assign workspace_admin role
  INSERT INTO public.workspace_members (workspace_owner_id, user_id, role, status)
  VALUES (new.id, new.id, 'workspace_admin', 'active')
  ON CONFLICT DO NOTHING;

  -- Auto-create default location
  INSERT INTO public.warehouses (name, code, created_by)
  VALUES ('Primary Location', 'LOC-01', new.id)
  RETURNING id INTO default_warehouse_id;

  IF default_warehouse_id IS NOT NULL THEN
    INSERT INTO public.warehouse_sections (name, warehouse_id, created_by)
    VALUES ('Section A', default_warehouse_id, new.id);
  END IF;

  RETURN new;
END;
$$;

-- Function to expire trials (called by cron edge function)
CREATE OR REPLACE FUNCTION public.expire_trials()
  RETURNS INTEGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.workspace_plans
  SET status = 'read_only', 
      workspace_status = 'read_only',
      updated_at = now()
  WHERE status = 'trial'
    AND trial_end_date IS NOT NULL
    AND trial_end_date < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Also update workspace_settings subscription_status
  UPDATE public.workspace_settings ws
  SET subscription_status = 'expired', updated_at = now()
  FROM public.workspace_plans wp
  WHERE ws.user_id = wp.user_id
    AND wp.status = 'read_only'
    AND ws.subscription_status = 'trialing';

  RETURN expired_count;
END;
$$;
