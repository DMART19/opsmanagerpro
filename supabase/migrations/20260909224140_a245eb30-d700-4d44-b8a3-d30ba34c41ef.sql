-- Count all billable "items" across the tables that actually hold inventory.
CREATE OR REPLACE FUNCTION public.plan_item_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (SELECT COUNT(*) FROM public.cache_inventory
          WHERE user_id = p_user_id AND deleted_at IS NULL)
       + (SELECT COUNT(*) FROM public.equipment WHERE user_id = p_user_id);
$$;

REVOKE ALL ON FUNCTION public.plan_item_count(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_asset_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  max_allowed integer;
  stored_max integer;
  v_plan public.workspace_plan;
  v_status public.plan_status;
  v_trial_end timestamptz;
  ws_status text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles
             WHERE user_id = NEW.user_id AND role = 'super_admin') THEN
    RETURN NEW;
  END IF;

  SELECT plan, status, workspace_status, max_assets, trial_end_date
  INTO v_plan, v_status, ws_status, stored_max, v_trial_end
  FROM public.workspace_plans WHERE user_id = NEW.user_id;

  IF v_plan IS NULL THEN
    v_plan := 'inventory';
    ws_status := 'active';
  END IF;

  IF ws_status IN ('read_only','archived') THEN
    RAISE EXCEPTION 'Workspace is in % mode. Update billing to continue.', ws_status;
  END IF;

  SELECT l.max_assets INTO max_allowed FROM public.plan_limits(v_plan) l;

  -- Enterprise: custom allowance from the plan record; -1 = unlimited.
  IF max_allowed = -1 THEN
    IF v_plan = 'enterprise' AND stored_max IS NOT NULL AND stored_max > 0 THEN
      max_allowed := stored_max;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  current_count := public.plan_item_count(NEW.user_id);

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Item limit reached (% / %). Upgrade your plan to add more items.',
      current_count, max_allowed;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply the item limit to the table that actually stores inventory.
DROP TRIGGER IF EXISTS enforce_asset_limit_cache_inventory ON public.cache_inventory;
CREATE TRIGGER enforce_asset_limit_cache_inventory
  BEFORE INSERT ON public.cache_inventory
  FOR EACH ROW EXECUTE FUNCTION public.check_asset_limit();