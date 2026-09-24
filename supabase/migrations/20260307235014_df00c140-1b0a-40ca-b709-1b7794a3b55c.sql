
-- Prevent removing the last workspace_admin via role change
CREATE OR REPLACE FUNCTION public.prevent_last_admin_role_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Only check when role is being changed away from workspace_admin
  IF OLD.role = 'workspace_admin' AND NEW.role != 'workspace_admin' THEN
    SELECT COUNT(*) INTO admin_count
    FROM public.workspace_members
    WHERE workspace_owner_id = OLD.workspace_owner_id
      AND role = 'workspace_admin'
      AND status = 'active'
      AND id != OLD.id;

    IF admin_count < 1 THEN
      RAISE EXCEPTION 'A workspace must have at least one administrator.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_role_change ON public.workspace_members;
CREATE TRIGGER trg_prevent_last_admin_role_change
  BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_admin_role_change();

-- Prevent deleting the last workspace_admin
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  IF OLD.role = 'workspace_admin' THEN
    SELECT COUNT(*) INTO admin_count
    FROM public.workspace_members
    WHERE workspace_owner_id = OLD.workspace_owner_id
      AND role = 'workspace_admin'
      AND status = 'active'
      AND id != OLD.id;

    IF admin_count < 1 THEN
      RAISE EXCEPTION 'A workspace must have at least one administrator.';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_removal ON public.workspace_members;
CREATE TRIGGER trg_prevent_last_admin_removal
  BEFORE DELETE ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_admin_removal();
