-- Add workspace lifecycle columns to workspace_plans
ALTER TABLE public.workspace_plans
  ADD COLUMN IF NOT EXISTS workspace_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Add past_due and archived to the plan_status enum
ALTER TYPE public.plan_status ADD VALUE IF NOT EXISTS 'past_due';
ALTER TYPE public.plan_status ADD VALUE IF NOT EXISTS 'archived';

-- Update existing rows to have workspace_status = 'active'
UPDATE public.workspace_plans SET workspace_status = 'active' WHERE workspace_status IS NULL;

-- Create a validation trigger for workspace_status values
CREATE OR REPLACE FUNCTION public.validate_workspace_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.workspace_status NOT IN ('active', 'past_due', 'read_only', 'archived') THEN
    RAISE EXCEPTION 'Invalid workspace_status: %. Must be active, past_due, read_only, or archived.', NEW.workspace_status;
  END IF;
  
  -- Auto-set archived_at when transitioning to archived
  IF NEW.workspace_status = 'archived' AND (OLD.workspace_status IS DISTINCT FROM 'archived') THEN
    NEW.archived_at := now();
  END IF;
  
  -- Clear archived_at when reactivating
  IF NEW.workspace_status = 'active' AND OLD.workspace_status = 'archived' THEN
    NEW.archived_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_workspace_status_trigger
  BEFORE INSERT OR UPDATE ON public.workspace_plans
  FOR EACH ROW EXECUTE FUNCTION public.validate_workspace_status();

-- Create check_employee_limit function (mirrors check_asset_limit)
CREATE OR REPLACE FUNCTION public.check_employee_limit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
  ws_status text;
BEGIN
  SELECT max_team_members, workspace_status INTO max_allowed, ws_status
  FROM public.workspace_plans
  WHERE user_id = NEW.user_id;
  
  IF max_allowed IS NULL THEN
    max_allowed := 0;
  END IF;
  
  -- Block writes in non-active states
  IF ws_status IN ('read_only', 'archived') THEN
    RAISE EXCEPTION 'Workspace is in % mode. Update billing to continue.', ws_status;
  END IF;
  
  -- Inventory plan: no team members allowed
  IF max_allowed = 0 THEN
    RAISE EXCEPTION 'Team members are not available on your current plan. Upgrade to Operations.';
  END IF;
  
  SELECT COUNT(*) INTO current_count
  FROM public.employees
  WHERE user_id = NEW.user_id;
  
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Team member limit reached (% / %). Upgrade your plan.', current_count, max_allowed;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_employee_limit_trigger
  BEFORE INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.check_employee_limit();

-- Update check_asset_limit to respect workspace_status
CREATE OR REPLACE FUNCTION public.check_asset_limit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
  ws_status text;
BEGIN
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