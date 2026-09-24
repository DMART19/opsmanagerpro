-- Update check_employee_limit: Inventory plan now allows 5 users (per PDF).
-- Default to 5 (inventory) instead of 0 when no plan found.
-- Remove the "no team on inventory" block since all plans allow users.

CREATE OR REPLACE FUNCTION public.check_employee_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
  ws_status text;
  is_super boolean;
BEGIN
  -- Check if user is super_admin → bypass all limits
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.user_id AND role = 'super_admin'
  ) INTO is_super;
  
  IF is_super THEN
    RETURN NEW;
  END IF;

  SELECT max_team_members, workspace_status INTO max_allowed, ws_status
  FROM public.workspace_plans
  WHERE user_id = NEW.user_id;
  
  -- Default to Inventory plan limit (5 users)
  IF max_allowed IS NULL THEN
    max_allowed := 5;
  END IF;
  
  -- Block writes in non-active states
  IF ws_status IN ('read_only', 'archived') THEN
    RAISE EXCEPTION 'Workspace is in % mode. Update billing to continue.', ws_status;
  END IF;
  
  SELECT COUNT(*) INTO current_count
  FROM public.employees
  WHERE user_id = NEW.user_id
    AND deleted_at IS NULL;
  
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Team member limit reached (% / %). Upgrade your plan.', current_count, max_allowed;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Also update check_asset_limit to exclude soft-deleted and use consistent default
CREATE OR REPLACE FUNCTION public.check_asset_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
  ws_status text;
  is_super boolean;
BEGIN
  -- Check if user is super_admin → bypass all limits
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.user_id AND role = 'super_admin'
  ) INTO is_super;
  
  IF is_super THEN
    RETURN NEW;
  END IF;

  SELECT max_assets, workspace_status INTO max_allowed, ws_status
  FROM public.workspace_plans
  WHERE user_id = NEW.user_id;
  
  IF max_allowed IS NULL THEN
    max_allowed := 1000;
  END IF;
  
  -- Block writes in non-active states
  IF ws_status IN ('read_only', 'archived') THEN
    RAISE EXCEPTION 'Workspace is in % mode. Update billing to continue.', ws_status;
  END IF;
  
  SELECT COUNT(*) INTO current_count
  FROM public.equipment
  WHERE user_id = NEW.user_id;
  
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Asset limit reached (% / %). Upgrade your plan to add more assets.', current_count, max_allowed;
  END IF;
  
  RETURN NEW;
END;
$$;