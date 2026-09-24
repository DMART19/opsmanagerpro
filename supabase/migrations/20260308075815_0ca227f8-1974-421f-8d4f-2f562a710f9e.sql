
-- Table to store computed upgrade intelligence scores
CREATE TABLE public.upgrade_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  score integer NOT NULL DEFAULT 0,
  asset_usage_pct numeric(5,2) DEFAULT 0,
  team_usage_pct numeric(5,2) DEFAULT 0,
  locked_feature_attempts integer DEFAULT 0,
  asset_growth_rate numeric(8,2) DEFAULT 0,
  top_signals jsonb DEFAULT '[]'::jsonb,
  current_plan text DEFAULT 'inventory',
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.upgrade_signals ENABLE ROW LEVEL SECURITY;

-- Only admins (via service role) write to this; no public access needed
CREATE POLICY "Service role only" ON public.upgrade_signals FOR ALL USING (false);

-- Function to compute upgrade scores for all workspaces
CREATE OR REPLACE FUNCTION public.compute_upgrade_scores()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  wp RECORD;
  score integer;
  signals jsonb;
  asset_count integer;
  team_count integer;
  asset_pct numeric;
  team_pct numeric;
  locked_attempts integer;
  growth_rate numeric;
  recent_assets integer;
  older_assets integer;
  processed integer := 0;
BEGIN
  FOR wp IN
    SELECT user_id, plan, max_assets, max_team_members
    FROM workspace_plans
    WHERE workspace_status = 'active'
      AND status IN ('trial', 'active')
  LOOP
    score := 0;
    signals := '[]'::jsonb;

    -- 1. Asset usage percentage
    SELECT COUNT(*) INTO asset_count
    FROM cache_inventory WHERE user_id = wp.user_id;

    asset_pct := CASE WHEN wp.max_assets > 0
      THEN ROUND((asset_count::numeric / wp.max_assets) * 100, 2)
      ELSE 0 END;

    IF asset_pct >= 90 THEN
      score := score + 35;
      signals := signals || jsonb_build_array(jsonb_build_object('signal', 'asset_limit_critical', 'detail', asset_count || '/' || wp.max_assets));
    ELSIF asset_pct >= 70 THEN
      score := score + 20;
      signals := signals || jsonb_build_array(jsonb_build_object('signal', 'asset_limit_approaching', 'detail', asset_count || '/' || wp.max_assets));
    ELSIF asset_pct >= 50 THEN
      score := score + 10;
    END IF;

    -- 2. Team member usage
    SELECT COUNT(*) INTO team_count
    FROM employees WHERE user_id = wp.user_id;

    team_pct := CASE WHEN COALESCE(wp.max_team_members, 0) > 0
      THEN ROUND((team_count::numeric / wp.max_team_members) * 100, 2)
      ELSE 0 END;

    IF team_pct >= 90 THEN
      score := score + 25;
      signals := signals || jsonb_build_array(jsonb_build_object('signal', 'team_limit_critical', 'detail', team_count || '/' || wp.max_team_members));
    ELSIF team_pct >= 70 THEN
      score := score + 15;
      signals := signals || jsonb_build_array(jsonb_build_object('signal', 'team_limit_approaching', 'detail', team_count || '/' || wp.max_team_members));
    END IF;

    -- 3. Locked feature attempts (from friction_events in last 7 days)
    SELECT COUNT(*) INTO locked_attempts
    FROM friction_events
    WHERE user_id = wp.user_id
      AND event_type = 'gated_feature_attempt'
      AND created_at > now() - interval '7 days';

    IF locked_attempts >= 10 THEN
      score := score + 25;
      signals := signals || jsonb_build_array(jsonb_build_object('signal', 'heavy_gated_attempts', 'detail', locked_attempts || ' attempts in 7d'));
    ELSIF locked_attempts >= 3 THEN
      score := score + 15;
      signals := signals || jsonb_build_array(jsonb_build_object('signal', 'gated_feature_interest', 'detail', locked_attempts || ' attempts in 7d'));
    END IF;

    -- 4. Rapid asset growth (compare last 7 days vs prior 7 days)
    SELECT COUNT(*) INTO recent_assets
    FROM cache_inventory
    WHERE user_id = wp.user_id AND created_at > now() - interval '7 days';

    SELECT COUNT(*) INTO older_assets
    FROM cache_inventory
    WHERE user_id = wp.user_id
      AND created_at > now() - interval '14 days'
      AND created_at <= now() - interval '7 days';

    growth_rate := CASE WHEN older_assets > 0
      THEN ROUND(((recent_assets - older_assets)::numeric / older_assets) * 100, 2)
      ELSE CASE WHEN recent_assets > 0 THEN 100.0 ELSE 0 END
    END;

    IF recent_assets >= 10 AND growth_rate >= 50 THEN
      score := score + 15;
      signals := signals || jsonb_build_array(jsonb_build_object('signal', 'rapid_growth', 'detail', recent_assets || ' new assets this week'));
    END IF;

    -- Cap at 100
    score := LEAST(score, 100);

    -- Upsert
    INSERT INTO upgrade_signals (user_id, score, asset_usage_pct, team_usage_pct, locked_feature_attempts, asset_growth_rate, top_signals, current_plan, computed_at)
    VALUES (wp.user_id, score, asset_pct, team_pct, locked_attempts, growth_rate, signals, wp.plan, now())
    ON CONFLICT (user_id) DO UPDATE SET
      score = EXCLUDED.score,
      asset_usage_pct = EXCLUDED.asset_usage_pct,
      team_usage_pct = EXCLUDED.team_usage_pct,
      locked_feature_attempts = EXCLUDED.locked_feature_attempts,
      asset_growth_rate = EXCLUDED.asset_growth_rate,
      top_signals = EXCLUDED.top_signals,
      current_plan = EXCLUDED.current_plan,
      computed_at = EXCLUDED.computed_at;

    processed := processed + 1;
  END LOOP;

  RETURN processed;
END;
$$;
