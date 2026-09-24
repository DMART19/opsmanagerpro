
-- Drop the unique constraint on warehouses.code
ALTER TABLE public.warehouses DROP CONSTRAINT IF EXISTS warehouses_code_key;

-- Add a composite unique constraint (code + created_by)
CREATE UNIQUE INDEX IF NOT EXISTS warehouses_code_created_by_key ON public.warehouses (code, created_by);

-- Drop section_code constraint if exists
ALTER TABLE public.warehouse_sections DROP CONSTRAINT IF EXISTS warehouse_sections_section_code_key;

-- Recreate as composite
CREATE UNIQUE INDEX IF NOT EXISTS warehouse_sections_code_warehouse_key 
  ON public.warehouse_sections (section_code, warehouse_id);

-- Update the trigger to use unique codes based on user id prefix
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  default_warehouse_id uuid;
  user_code_suffix text;
BEGIN
  user_code_suffix := upper(substring(new.id::text from 1 for 6));

  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.workspace_plans (
    user_id, plan, status, max_assets, max_team_members, 
    workspace_status, trial_start_date, trial_end_date
  )
  VALUES (
    new.id, 'inventory', 'trial', 1000, 5, 
    'active', now(), now() + interval '14 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.workspace_settings (user_id, subscription_status, trial_started_at, trial_ends_at)
  VALUES (new.id, 'trialing', now(), now() + interval '14 days')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.workspace_members (workspace_owner_id, user_id, role, status)
  VALUES (new.id, new.id, 'workspace_admin', 'active')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.warehouses (name, code, created_by)
  VALUES ('Primary Location', 'LOC-' || user_code_suffix, new.id)
  RETURNING id INTO default_warehouse_id;

  IF default_warehouse_id IS NOT NULL THEN
    INSERT INTO public.warehouse_sections (section_name, section_code, warehouse_id, created_by)
    VALUES ('Section A', 'SEC-' || user_code_suffix, default_warehouse_id, new.id);
  END IF;

  RETURN new;
END;
$$;
