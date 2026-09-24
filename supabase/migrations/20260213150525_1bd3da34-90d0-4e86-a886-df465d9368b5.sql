
-- Update the handle_new_user trigger to use "Primary Location" instead of "Main Warehouse"
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  default_warehouse_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);

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
