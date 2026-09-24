
-- Update handle_new_user to auto-create workspace_plans and assign workspace_admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  default_warehouse_id uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);

  -- Auto-create default workspace plan (Inventory tier)
  INSERT INTO public.workspace_plans (user_id)
  VALUES (new.id);

  -- Auto-create workspace settings
  INSERT INTO public.workspace_settings (user_id)
  VALUES (new.id)
  ON CONFLICT DO NOTHING;

  -- Auto-assign workspace_admin role to workspace owner
  INSERT INTO public.workspace_members (workspace_owner_id, user_id, role, status)
  VALUES (new.id, new.id, 'workspace_admin', 'active');

  -- Auto-create a default location for every new user
  INSERT INTO public.warehouses (name, code, created_by)
  VALUES ('Primary Location', 'LOC-01', new.id)
  RETURNING id INTO default_warehouse_id;

  -- Auto-create a default section inside the location
  INSERT INTO public.warehouse_sections (name, warehouse_id, created_by)
  VALUES ('Section A', default_warehouse_id, new.id);

  RETURN new;
END;
$$;
