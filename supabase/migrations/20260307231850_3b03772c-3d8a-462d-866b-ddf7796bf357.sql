
-- Fix search_path on new functions
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_workspace_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.role NOT IN ('viewer', 'inventory_clerk', 'safety_manager', 'supervisor', 'workspace_admin') THEN
    RAISE EXCEPTION 'Invalid workspace role: %', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;
