-- 1) Lapsed trials lose access immediately, even before the expiry job runs.
CREATE OR REPLACE FUNCTION public.plan_check_feature(p_user_id uuid, p_feature text)
 RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid; v_plan public.workspace_plan; v_status public.plan_status;
  v_ws_status text; v_trial_end timestamptz; v_required public.workspace_plan;
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles
             WHERE user_id = COALESCE(auth.uid(), p_user_id) AND role = 'super_admin') THEN
    RETURN;
  END IF;
  v_owner := public.plan_owner_for_user(p_user_id);
  IF v_owner IS NULL THEN RETURN; END IF;

  SELECT plan, status, workspace_status, trial_end_date
  INTO v_plan, v_status, v_ws_status, v_trial_end
  FROM public.workspace_plans WHERE user_id = v_owner;

  IF v_ws_status IN ('read_only','archived') OR v_status = 'read_only' THEN
    RAISE EXCEPTION 'Workspace is in read-only mode. Update billing to continue.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_status = 'trial' THEN
    IF v_trial_end IS NOT NULL AND v_trial_end > now() THEN
      RETURN; -- active trial: full exploration (usage caps enforced by check_trial_limit)
    END IF;
    RAISE EXCEPTION 'Your free trial has ended. Choose a plan to continue.'
      USING ERRCODE = 'check_violation';
  END IF;

  v_required := public.plan_feature_min_tier(p_feature);
  IF public.plan_tier_rank(v_plan) < public.plan_tier_rank(v_required) THEN
    RAISE EXCEPTION 'Your plan does not include this feature (% requires the % plan or higher).',
      p_feature, v_required USING ERRCODE = 'check_violation';
  END IF;
END;
$function$;

-- 2) Trial caps apply only to real trials, resolved via the workspace owner.
CREATE OR REPLACE FUNCTION public.check_trial_limit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid; v_owner uuid; v_trial_end timestamptz; v_status public.plan_status;
  v_current_count bigint; v_limit int; v_rec jsonb;
BEGIN
  v_rec := to_jsonb(NEW);
  IF v_rec ? 'user_id' AND v_rec->>'user_id' IS NOT NULL THEN
    v_user_id := (v_rec->>'user_id')::uuid;
  ELSIF v_rec ? 'created_by' AND v_rec->>'created_by' IS NOT NULL THEN
    v_user_id := (v_rec->>'created_by')::uuid;
  ELSE
    RETURN NEW;
  END IF;

  v_owner := COALESCE(public.plan_owner_for_user(v_user_id), v_user_id);
  SELECT trial_end_date, status INTO v_trial_end, v_status
  FROM workspace_plans WHERE user_id = v_owner;

  IF v_status IS DISTINCT FROM 'trial' THEN
    RETURN NEW; -- paid plans: plan limits enforced elsewhere
  END IF;
  IF v_trial_end IS NULL OR v_trial_end <= now() THEN
    RAISE EXCEPTION 'Your free trial has ended. Choose a plan to continue.'
      USING ERRCODE = 'check_violation';
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'cache_inventory' THEN v_limit := 100;
      SELECT count(*) INTO v_current_count FROM cache_inventory WHERE user_id = v_owner AND deleted_at IS NULL;
    WHEN 'cache_boxes' THEN v_limit := 25;
      SELECT count(*) INTO v_current_count FROM cache_boxes WHERE user_id = v_owner;
    WHEN 'pallets' THEN v_limit := 20;
      SELECT count(*) INTO v_current_count FROM pallets WHERE created_by = v_owner;
    WHEN 'custom_trailers' THEN v_limit := 10;
      SELECT count(*) INTO v_current_count FROM custom_trailers WHERE created_by = v_owner;
    WHEN 'tasks' THEN v_limit := 50;
      SELECT count(*) INTO v_current_count FROM tasks WHERE user_id = v_owner;
    WHEN 'employees' THEN v_limit := 3;
      SELECT count(*) INTO v_current_count FROM employees WHERE user_id = v_owner AND deleted_at IS NULL;
    ELSE RETURN NEW;
  END CASE;

  IF v_current_count >= v_limit THEN
    RAISE EXCEPTION 'Trial limit reached: % allows a maximum of % records (current: %)',
      TG_TABLE_NAME, v_limit, v_current_count USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) Private token so the scheduled expiry job can authenticate.
CREATE TABLE IF NOT EXISTS public.internal_cron_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.internal_cron_tokens TO service_role;
REVOKE ALL ON public.internal_cron_tokens FROM anon, authenticated;
ALTER TABLE public.internal_cron_tokens ENABLE ROW LEVEL SECURITY;
INSERT INTO public.internal_cron_tokens(name) VALUES ('expire-trials') ON CONFLICT DO NOTHING;

SELECT cron.unschedule('expire-trials-daily');
SELECT cron.schedule('expire-trials-daily', '0 */6 * * *', $cron$
  SELECT public.expire_trials();
  SELECT net.http_post(
    url := 'https://estygfqgxlbluqqkwway.supabase.co/functions/v1/expire-trials',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-cron-secret', (SELECT token FROM public.internal_cron_tokens WHERE name='expire-trials')),
    body := '{}'::jsonb);
$cron$);

-- Expire overdue trials now.
SELECT public.expire_trials();