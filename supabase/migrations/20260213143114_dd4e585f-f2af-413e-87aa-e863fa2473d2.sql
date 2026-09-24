
-- Update handle_new_user to auto-create a default warehouse and section
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_warehouse_id uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    new.email
  );

  -- Create default warehouse
  INSERT INTO public.warehouses (id, name, code, location, active, created_by)
  VALUES (gen_random_uuid(), 'Main Warehouse', 'WH-MAIN', 'Default location', true, new.id)
  RETURNING id INTO new_warehouse_id;

  -- Create default section
  INSERT INTO public.warehouse_sections (warehouse_id, section_code, section_name, max_capacity, created_by)
  VALUES (new_warehouse_id, 'A', 'Section A', 24, new.id);

  RETURN new;
END;
$$;
