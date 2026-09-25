-- Launch funnel instrumentation. Product events intentionally contain no email,
-- names, addresses, or other customer-entered values.

ALTER TABLE public.product_events
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS event_source text NOT NULL DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_events_dedupe_key
  ON public.product_events (dedupe_key);

ALTER TABLE public.workspace_settings
  ADD COLUMN IF NOT EXISTS exclude_from_metrics boolean NOT NULL DEFAULT false;

-- Replace the original policy with workspace-aware validation. RLS remains the
-- final authority even if a caller tampers with the browser payload.
DROP POLICY IF EXISTS "Users can insert own events" ON public.product_events;
CREATE POLICY "Users can insert own workspace events"
  ON public.product_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      workspace_id IS NULL
      OR workspace_id = public.get_effective_workspace_id()
    )
  );

-- The only public event is a content-free homepage visit. This deliberately
-- disallows metadata, identity fields, test flags, and caller-supplied keys.
DROP POLICY IF EXISTS "Anonymous homepage visits" ON public.product_events;
CREATE POLICY "Anonymous homepage visits"
  ON public.product_events
  FOR INSERT
  TO anon
  WITH CHECK (
    event_type = 'website_visited'
    AND user_id IS NULL
    AND workspace_id IS NULL
    AND dedupe_key IS NULL
    AND event_source = 'client'
    AND is_test = false
    AND COALESCE(metadata, '{}'::jsonb) = '{}'::jsonb
  );

DROP POLICY IF EXISTS "Authenticated homepage visits" ON public.product_events;
CREATE POLICY "Authenticated homepage visits"
  ON public.product_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    event_type = 'website_visited'
    AND user_id IS NULL
    AND workspace_id IS NULL
    AND dedupe_key IS NULL
    AND event_source = 'client'
    AND is_test = false
    AND COALESCE(metadata, '{}'::jsonb) = '{}'::jsonb
  );

GRANT INSERT ON public.product_events TO anon, authenticated;

-- Super admins need read access for aggregate launch reporting. Regular users
-- retain the existing own-event policy and cannot inspect other workspaces.
DROP POLICY IF EXISTS "Super admins can view launch events" ON public.product_events;
CREATE POLICY "Super admins can view launch events"
  ON public.product_events
  FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.record_launch_milestone(
  p_event_type text,
  p_workspace_id uuid,
  p_user_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid := COALESCE(p_workspace_id, public.get_effective_workspace_id(), p_user_id);
  v_user_id uuid := COALESCE(p_user_id, (SELECT auth.uid()));
BEGIN
  IF v_workspace_id IS NULL OR v_user_id IS NULL THEN
    RETURN;
  END IF;

  IF p_event_type <> ALL (ARRAY[
    'signup_completed',
    'workspace_created',
    'first_location_created',
    'first_inventory_created',
    'first_team_member_added',
    'first_operation_completed'
  ]) THEN
    RETURN;
  END IF;

  INSERT INTO public.product_events (
    event_type,
    workspace_id,
    user_id,
    metadata,
    dedupe_key,
    event_source,
    is_test
  )
  VALUES (
    p_event_type,
    v_workspace_id,
    v_user_id,
    COALESCE(p_metadata, '{}'::jsonb),
    v_workspace_id::text || ':' || p_event_type,
    'database_trigger',
    false
  )
  ON CONFLICT (dedupe_key) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  -- Analytics must never roll back a customer workflow.
  RAISE WARNING 'Launch milestone % was not recorded: %', p_event_type, SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.record_launch_milestone(text, uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_launch_milestone(text, uuid, uuid, jsonb)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.capture_first_location_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.is_demo, false) OR NEW.demo_session_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.record_launch_milestone(
    'first_location_created',
    COALESCE(NEW.created_by, public.get_effective_workspace_id()),
    (SELECT auth.uid())
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_signup_completed_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  PERFORM public.record_launch_milestone(
    'signup_completed',
    NEW.id,
    (SELECT auth.uid())
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_workspace_created_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  PERFORM public.record_launch_milestone(
    'workspace_created',
    NEW.user_id,
    (SELECT auth.uid())
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_first_inventory_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.custom_data ->> 'is_sample', 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  PERFORM public.record_launch_milestone(
    'first_inventory_created',
    COALESCE(NEW.user_id, public.get_effective_workspace_id()),
    (SELECT auth.uid())
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_first_team_member_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  PERFORM public.record_launch_milestone(
    'first_team_member_added',
    COALESCE(NEW.user_id, public.get_effective_workspace_id()),
    (SELECT auth.uid())
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_first_operation_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row jsonb := to_jsonb(NEW);
  v_workspace_id uuid;
BEGIN
  v_workspace_id := COALESCE(
    NULLIF(v_row ->> 'user_id', '')::uuid,
    NULLIF(v_row ->> 'created_by', '')::uuid,
    public.get_effective_workspace_id()
  );

  PERFORM public.record_launch_milestone(
    'first_operation_completed',
    v_workspace_id,
    (SELECT auth.uid()),
    jsonb_build_object('operation_type', TG_TABLE_NAME)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_launch_first_location ON public.warehouses;
CREATE TRIGGER trg_launch_first_location
  AFTER INSERT ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.capture_first_location_milestone();

DROP TRIGGER IF EXISTS trg_launch_signup_completed ON public.profiles;
CREATE TRIGGER trg_launch_signup_completed
  AFTER UPDATE OF last_login_at ON public.profiles
  FOR EACH ROW
  WHEN (NEW.last_login_at IS NOT NULL)
  EXECUTE FUNCTION public.capture_signup_completed_milestone();

DROP TRIGGER IF EXISTS trg_launch_workspace_created ON public.workspace_settings;
CREATE TRIGGER trg_launch_workspace_created
  AFTER UPDATE OF workspace_name ON public.workspace_settings
  FOR EACH ROW
  WHEN (NEW.workspace_name IS NOT NULL)
  EXECUTE FUNCTION public.capture_workspace_created_milestone();

DROP TRIGGER IF EXISTS trg_launch_first_inventory ON public.cache_inventory;
CREATE TRIGGER trg_launch_first_inventory
  AFTER INSERT ON public.cache_inventory
  FOR EACH ROW EXECUTE FUNCTION public.capture_first_inventory_milestone();

DROP TRIGGER IF EXISTS trg_launch_first_team_member ON public.employees;
CREATE TRIGGER trg_launch_first_team_member
  AFTER INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.capture_first_team_member_milestone();

DROP TRIGGER IF EXISTS trg_launch_first_completed_task ON public.tasks;
CREATE TRIGGER trg_launch_first_completed_task
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  WHEN (NEW.status = 'completed' OR NEW.completed_at IS NOT NULL)
  EXECUTE FUNCTION public.capture_first_operation_milestone();

DROP TRIGGER IF EXISTS trg_launch_first_item_checkout ON public.item_checkouts;
CREATE TRIGGER trg_launch_first_item_checkout
  AFTER INSERT ON public.item_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.capture_first_operation_milestone();

DROP TRIGGER IF EXISTS trg_launch_first_equipment_checkout ON public.equipment_checkouts;
CREATE TRIGGER trg_launch_first_equipment_checkout
  AFTER INSERT ON public.equipment_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.capture_first_operation_milestone();

-- SECURITY INVOKER ensures the underlying product_events RLS policies remain
-- active for every query of the reporting view.
CREATE OR REPLACE VIEW public.launch_funnel_daily
WITH (security_invoker = true)
AS
SELECT
  (pe.created_at AT TIME ZONE 'UTC')::date AS event_date,
  pe.event_type,
  count(*)::bigint AS event_count,
  count(DISTINCT pe.workspace_id)::bigint AS workspace_count
FROM public.product_events pe
LEFT JOIN public.workspace_settings ws
  ON ws.user_id = pe.workspace_id
WHERE pe.event_type = ANY (ARRAY[
  'website_visited',
  'signup_completed',
  'workspace_created',
  'first_location_created',
  'first_inventory_created',
  'first_team_member_added',
  'first_operation_completed',
  'checkout_started',
  'subscription_activated',
  'subscription_cancelled'
])
AND pe.is_test = false
AND COALESCE(ws.exclude_from_metrics, false) = false
GROUP BY 1, 2;

REVOKE ALL ON public.launch_funnel_daily FROM PUBLIC, anon;
GRANT SELECT ON public.launch_funnel_daily TO authenticated, service_role;

COMMENT ON COLUMN public.workspace_settings.exclude_from_metrics IS
  'When true, this workspace is omitted from launch funnel reports, including historical events.';
COMMENT ON VIEW public.launch_funnel_daily IS
  'UTC daily launch funnel counts with test workspaces excluded.';
