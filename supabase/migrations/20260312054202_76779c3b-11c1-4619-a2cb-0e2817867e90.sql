CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    INSERT INTO public.warehouse_sections (section_name, warehouse_id, created_by)
    VALUES ('Section A', default_warehouse_id, new.id);
  END IF;

  RETURN new;
END;
$$;