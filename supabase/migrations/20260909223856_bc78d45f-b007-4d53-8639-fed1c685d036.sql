-- =====================================================================
-- CENTRALIZED PLAN ENFORCEMENT
-- =====================================================================

-- Tier ranking -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.plan_tier_rank(p_plan public.workspace_plan)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_plan
    WHEN 'inventory' THEN 0
    WHEN 'operations' THEN 1
    WHEN 'operations_pro' THEN 2
    ELSE 3
  END;
$$;

-- Canonical plan allowances (-1 = unlimited / custom) -----------------
CREATE OR REPLACE FUNCTION public.plan_limits(p_plan public.workspace_plan)
RETURNS TABLE(max_users integer, max_assets integer, max_locations integer)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT t.max_users, t.max_assets, t.max_locations FROM (VALUES
    ('inventory'::public.workspace_plan, 3, 500, 1),
    ('operations'::public.workspace_plan, 10, 2500, 2),
    ('operations_pro'::public.workspace_plan, 30, 10000, 5)
  ) AS t(plan, max_users, max_assets, max_locations)
  WHERE t.plan = p_plan
  UNION ALL
  SELECT -1, -1, -1
  WHERE p_plan NOT IN ('inventory','operations','operations_pro');
$$;

-- Canonical feature -> minimum plan map ------------------------------
CREATE OR REPLACE FUNCTION public.plan_feature_min_tier(p_feature text)
RETURNS public.workspace_plan
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_feature
    -- Inventory (all plans)
    WHEN 'asset_container_crud' THEN 'inventory'
    WHEN 'barcode_qr_scanning' THEN 'inventory'
    WHEN 'csv_import_export' THEN 'inventory'
    -- Team, compliance, tasks, calendar (Operations+)
    WHEN 'team_directory_member_profiles' THEN 'operations'
    WHEN 'credential_definitions_assignment' THEN 'operations'
    WHEN 'credential_expiration_alerts' THEN 'operations'
    WHEN 'add_view_tasks' THEN 'operations'
    WHEN 'calendar_views' THEN 'operations'
    WHEN 'recurring_tasks_drag_drop' THEN 'operations'
    -- Logistics / layout tools (Logistics Pro+)
    WHEN 'pallet_builder' THEN 'operations_pro'
    WHEN 'trailer_space_planner' THEN 'operations_pro'
    WHEN 'load_intelligence_auto_pack' THEN 'operations_pro'
    WHEN 'save_load_export_layouts' THEN 'operations_pro'
    WHEN 'ai_load_planning' THEN 'operations_pro'
    WHEN 'multi_location' THEN 'operations_pro'
    ELSE 'operations_pro'
  END::public.workspace_plan;
$$;

-- Resolve the owning workspace for any member ------------------------
CREATE OR REPLACE FUNCTION public.plan_owner_for_user(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner uuid;
BEGIN
  IF p_user_id IS NULL THEN RETURN NULL; END IF;

  SELECT user_id INTO v_owner FROM public.workspace_plans WHERE user_id = p_user_id;
  IF v_owner IS NOT NULL THEN RETURN v_owner; END IF;

  SELECT workspace_owner_id INTO v_owner
  FROM public.workspace_members
  WHERE user_id = p_user_id
  LIMIT 1;

  RETURN v_owner;
END;
$$;

-- Central entitlement check ------------------------------------------
CREATE OR REPLACE FUNCTION public.plan_check_feature(p_user_id uuid, p_feature text)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_plan public.workspace_plan;
  v_status public.plan_status;
  v_ws_status text;
  v_trial_end timestamptz;
  v_required public.workspace_plan;
BEGIN
  -- Platform super admins bypass plan gating.
  IF EXISTS (SELECT 1 FROM public.user_roles
             WHERE user_id = COALESCE(auth.uid(), p_user_id) AND role = 'super_admin') THEN
    RETURN;
  END IF;

  v_owner := public.plan_owner_for_user(p_user_id);
  IF v_owner IS NULL THEN
    RETURN; -- no workspace record yet (e.g. seeding); other policies still apply
  END IF;

  SELECT plan, status, workspace_status, trial_end_date
  INTO v_plan, v_status, v_ws_status, v_trial_end
  FROM public.workspace_plans WHERE user_id = v_owner;

  IF v_ws_status IN ('read_only','archived') THEN
    RAISE EXCEPTION 'Workspace is in % mode. Update billing to continue.', v_ws_status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Active trials get full exploration access.
  IF v_status = 'trial' AND v_trial_end IS NOT NULL AND v_trial_end > now() THEN
    RETURN;
  END IF;

  v_required := public.plan_feature_min_tier(p_feature);

  IF public.plan_tier_rank(v_plan) < public.plan_tier_rank(v_required) THEN
    RAISE EXCEPTION 'Your plan does not include this feature (% requires the % plan or higher).',
      p_feature, v_required
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

-- Generic feature-gate trigger; feature name passed as trigger arg ----
CREATE OR REPLACE FUNCTION public.enforce_plan_feature()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec jsonb := to_jsonb(NEW);
  v_user uuid;
BEGIN
  IF v_rec ? 'user_id' AND v_rec->>'user_id' IS NOT NULL THEN
    v_user := (v_rec->>'user_id')::uuid;
  ELSIF v_rec ? 'created_by' AND v_rec->>'created_by' IS NOT NULL THEN
    v_user := (v_rec->>'created_by')::uuid;
  ELSE
    v_user := auth.uid();
  END IF;

  PERFORM public.plan_check_feature(v_user, TG_ARGV[0]);
  RETURN NEW;
END;
$$;

-- =====================================================================
-- Limits derived from the plan, not from tamperable stored columns
-- =====================================================================
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
  ws_status text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles
             WHERE user_id = NEW.user_id AND role = 'super_admin') THEN
    RETURN NEW;
  END IF;

  SELECT plan, workspace_status, max_assets
  INTO v_plan, ws_status, stored_max
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

  SELECT COUNT(*) INTO current_count FROM public.equipment WHERE user_id = NEW.user_id;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Asset limit reached (% / %). Upgrade your plan to add more assets.',
      current_count, max_allowed;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_employee_limit()
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
  ws_status text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles
             WHERE user_id = NEW.user_id AND role = 'super_admin') THEN
    RETURN NEW;
  END IF;

  SELECT plan, workspace_status, max_team_members
  INTO v_plan, ws_status, stored_max
  FROM public.workspace_plans WHERE user_id = NEW.user_id;

  IF v_plan IS NULL THEN
    v_plan := 'inventory';
    ws_status := 'active';
  END IF;

  IF ws_status IN ('read_only','archived') THEN
    RAISE EXCEPTION 'Workspace is in % mode. Update billing to continue.', ws_status;
  END IF;

  SELECT l.max_users INTO max_allowed FROM public.plan_limits(v_plan) l;

  IF max_allowed = -1 THEN
    IF v_plan = 'enterprise' AND stored_max IS NOT NULL AND stored_max > 0 THEN
      max_allowed := stored_max;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.employees WHERE user_id = NEW.user_id AND deleted_at IS NULL;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Team member limit reached (% / %). Upgrade your plan.',
      current_count, max_allowed;
  END IF;

  RETURN NEW;
END;
$$;

-- Warehouse / location limit -----------------------------------------
CREATE OR REPLACE FUNCTION public.check_warehouse_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_plan public.workspace_plan;
  ws_status text;
  max_allowed integer;
  current_count integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles
             WHERE user_id = COALESCE(auth.uid(), NEW.created_by) AND role = 'super_admin') THEN
    RETURN NEW;
  END IF;

  -- Demo/tour warehouses are not billable objects.
  IF to_jsonb(NEW) ? 'demo_session_id' AND NEW.demo_session_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_owner := public.plan_owner_for_user(NEW.created_by);
  IF v_owner IS NULL THEN RETURN NEW; END IF;

  SELECT plan, workspace_status INTO v_plan, ws_status
  FROM public.workspace_plans WHERE user_id = v_owner;

  IF ws_status IN ('read_only','archived') THEN
    RAISE EXCEPTION 'Workspace is in % mode. Update billing to continue.', ws_status;
  END IF;

  SELECT l.max_locations INTO max_allowed FROM public.plan_limits(v_plan) l;
  IF max_allowed = -1 THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.warehouses w
  WHERE w.created_by IN (
    SELECT user_id FROM public.workspace_members WHERE workspace_owner_id = v_owner
    UNION SELECT v_owner
  )
  AND w.demo_session_id IS NULL;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Location limit reached (% / %). Upgrade your plan to add more locations.',
      current_count, max_allowed;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_warehouse_limit ON public.warehouses;
CREATE TRIGGER trg_check_warehouse_limit
  BEFORE INSERT ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.check_warehouse_limit();

-- =====================================================================
-- Feature gates on premium write paths (INSERT only; existing rows keep working)
-- =====================================================================
DROP TRIGGER IF EXISTS trg_plan_gate_tasks ON public.tasks;
CREATE TRIGGER trg_plan_gate_tasks BEFORE INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('add_view_tasks');

DROP TRIGGER IF EXISTS trg_plan_gate_employees ON public.employees;
CREATE TRIGGER trg_plan_gate_employees BEFORE INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('team_directory_member_profiles');

DROP TRIGGER IF EXISTS trg_plan_gate_certifications ON public.certifications;
CREATE TRIGGER trg_plan_gate_certifications BEFORE INSERT ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('credential_definitions_assignment');

DROP TRIGGER IF EXISTS trg_plan_gate_requirement_definitions ON public.requirement_definitions;
CREATE TRIGGER trg_plan_gate_requirement_definitions BEFORE INSERT ON public.requirement_definitions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('credential_definitions_assignment');

DROP TRIGGER IF EXISTS trg_plan_gate_employee_requirements ON public.employee_requirements;
CREATE TRIGGER trg_plan_gate_employee_requirements BEFORE INSERT ON public.employee_requirements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('credential_definitions_assignment');

DROP TRIGGER IF EXISTS trg_plan_gate_saved_pallets ON public.saved_pallet_builds;
CREATE TRIGGER trg_plan_gate_saved_pallets BEFORE INSERT ON public.saved_pallet_builds
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('save_load_export_layouts');

DROP TRIGGER IF EXISTS trg_plan_gate_saved_trailers ON public.saved_trailer_layouts;
CREATE TRIGGER trg_plan_gate_saved_trailers BEFORE INSERT ON public.saved_trailer_layouts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('save_load_export_layouts');

DROP TRIGGER IF EXISTS trg_plan_gate_load_plans ON public.load_plans;
CREATE TRIGGER trg_plan_gate_load_plans BEFORE INSERT ON public.load_plans
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('load_intelligence_auto_pack');

DROP TRIGGER IF EXISTS trg_plan_gate_custom_pallets ON public.custom_pallets;
CREATE TRIGGER trg_plan_gate_custom_pallets BEFORE INSERT ON public.custom_pallets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('pallet_builder');

DROP TRIGGER IF EXISTS trg_plan_gate_custom_trailers ON public.custom_trailers;
CREATE TRIGGER trg_plan_gate_custom_trailers BEFORE INSERT ON public.custom_trailers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_feature('trailer_space_planner');

-- =====================================================================
-- Plan records can no longer be self-provisioned with custom allowances
-- =====================================================================
DROP POLICY IF EXISTS "Users can insert their own default plan" ON public.workspace_plans;
CREATE POLICY "Users can insert their own default plan"
ON public.workspace_plans
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND plan = 'inventory'::public.workspace_plan
  AND stripe_customer_id IS NULL
  AND stripe_subscription_id IS NULL
  AND stripe_price_id IS NULL
  AND max_assets <= 500
  AND max_team_members <= 3
  AND workspace_status = 'active'
);

REVOKE EXECUTE ON FUNCTION public.plan_check_feature(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.plan_owner_for_user(uuid) FROM anon;