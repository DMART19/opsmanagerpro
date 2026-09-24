-- 1. Idempotency + ordering ledger for Stripe webhooks -------------------
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  event_created timestamptz NOT NULL,
  stripe_object_id text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'processing',
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_object
  ON public.stripe_webhook_events (stripe_object_id, event_created DESC);

-- Only the service role (edge functions) may touch this ledger.
GRANT ALL ON public.stripe_webhook_events TO service_role;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Super admins can view webhook events"
  ON public.stripe_webhook_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Track the newest Stripe event applied to each workspace so a late/stale
-- event can never overwrite newer subscription state.
ALTER TABLE public.workspace_plans
  ADD COLUMN IF NOT EXISTS last_stripe_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

-- 2. New signups get correct Starter allowances ---------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_warehouse_id uuid;
  user_code_suffix text;
  starter_assets integer;
  starter_users integer;
BEGIN
  user_code_suffix := upper(substring(new.id::text from 1 for 6));

  SELECT max_assets, max_users INTO starter_assets, starter_users
  FROM public.plan_limits('inventory');

  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;

  -- 14-day trial, no payment details required.
  INSERT INTO public.workspace_plans (
    user_id, plan, status, max_assets, max_team_members,
    workspace_status, trial_start_date, trial_end_date
  )
  VALUES (
    new.id, 'inventory', 'trial', starter_assets, starter_users,
    'active', now(), now() + interval '14 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.workspace_settings (user_id, subscription_status, trial_started_at, trial_ends_at)
  VALUES (new.id, 'trialing', now(), now() + interval '14 days')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.workspace_members (workspace_owner_id, user_id, role, status)
  VALUES (new.id, new.id, 'workspace_admin', 'active')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.warehouses (name, code, created_by)
  VALUES ('Primary Location', 'LOC-' || user_code_suffix, new.id)
  RETURNING id INTO default_warehouse_id;

  IF default_warehouse_id IS NOT NULL THEN
    INSERT INTO public.warehouse_sections (section_name, section_code, warehouse_id, created_by)
    VALUES ('Section A', 'SEC-' || user_code_suffix, default_warehouse_id, new.id);
  END IF;

  RETURN new;
END;
$$;

-- 3. "Over limit" status must count real inventory ------------------------
CREATE OR REPLACE FUNCTION public.update_plan_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  current_count integer;
  max_allowed integer;
  current_status public.plan_status;
  v_plan public.workspace_plan;
BEGIN
  v_user := COALESCE(NEW.user_id, OLD.user_id);
  IF v_user IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT plan, status INTO v_plan, current_status
  FROM public.workspace_plans WHERE user_id = v_user;

  IF v_plan IS NULL OR current_status = 'read_only' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT max_assets INTO max_allowed FROM public.plan_limits(v_plan);
  IF max_allowed = -1 THEN RETURN COALESCE(NEW, OLD); END IF;

  current_count := public.plan_item_count(v_user);

  IF current_count >= max_allowed THEN
    UPDATE public.workspace_plans SET status = 'over_limit'
    WHERE user_id = v_user AND status = 'active';
  ELSE
    UPDATE public.workspace_plans SET status = 'active'
    WHERE user_id = v_user AND status = 'over_limit';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;