
-- Rate limit tracking table
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  window_start timestamptz NOT NULL DEFAULT now(),
  hit_count integer NOT NULL DEFAULT 1,
  max_hits integer NOT NULL DEFAULT 100,
  window_seconds integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(key, user_id, window_start)
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_key_user ON public.rate_limits(key, user_id, window_start DESC);
CREATE INDEX idx_rate_limits_cleanup ON public.rate_limits(window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system (service role) can write; no direct client access
CREATE POLICY "No direct client access to rate_limits"
  ON public.rate_limits
  FOR ALL
  TO authenticated
  USING (false);

-- Server-side rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_user_id uuid,
  p_max_hits integer DEFAULT 100,
  p_window_seconds integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window_start timestamptz;
  v_current_hits integer;
  v_allowed boolean;
BEGIN
  -- Calculate window start (floor to window boundary)
  v_window_start := date_trunc('minute', now());
  
  -- Upsert: increment or create
  INSERT INTO rate_limits (key, user_id, window_start, hit_count, max_hits, window_seconds)
  VALUES (p_key, p_user_id, v_window_start, 1, p_max_hits, p_window_seconds)
  ON CONFLICT (key, user_id, window_start)
  DO UPDATE SET hit_count = rate_limits.hit_count + 1
  RETURNING hit_count INTO v_current_hits;
  
  v_allowed := v_current_hits <= p_max_hits;
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current', v_current_hits,
    'limit', p_max_hits,
    'remaining', GREATEST(p_max_hits - v_current_hits, 0),
    'reset_at', v_window_start + (p_window_seconds || ' seconds')::interval
  );
END;
$$;

-- Cleanup old rate limit entries (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - interval '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
