
-- Admin alerts table for spike detection
CREATE TABLE public.admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL, -- 'error_spike', 'endpoint_failure', 'auth_failure'
  top_error TEXT NOT NULL,
  top_error_hash TEXT,
  hit_count INTEGER NOT NULL DEFAULT 0,
  details JSONB,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'dismissed'
  dismissed_at TIMESTAMPTZ,
  dismissed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/update admin alerts
CREATE POLICY "Authenticated users can read admin_alerts"
  ON public.admin_alerts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert admin_alerts"
  ON public.admin_alerts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update admin_alerts"
  ON public.admin_alerts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_alerts;

-- Function to check for error spikes and create alerts
CREATE OR REPLACE FUNCTION public.check_error_spikes()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  spike_window INTERVAL := '10 minutes';
  cutoff TIMESTAMPTZ := now() - spike_window;
  alert_record RECORD;
  alerts_created INTEGER := 0;
  result JSONB := '[]'::JSONB;
BEGIN
  -- 1) Critical error spike: same error_hash >= 5 hits in 10 min
  FOR alert_record IN
    SELECT error_hash, message, COUNT(*) as cnt, SUM(hit_count) as total_hits
    FROM error_logs
    WHERE last_seen_at > cutoff
      AND status = 'unresolved'
      AND severity IN ('critical', 'error')
    GROUP BY error_hash, message
    HAVING SUM(hit_count) >= 5
  LOOP
    -- Only create if no active alert for this hash exists in last 30 min
    IF NOT EXISTS (
      SELECT 1 FROM admin_alerts
      WHERE trigger_type = 'error_spike'
        AND top_error_hash = alert_record.error_hash
        AND status = 'active'
        AND created_at > now() - interval '30 minutes'
    ) THEN
      INSERT INTO admin_alerts (trigger_type, top_error, top_error_hash, hit_count, details)
      VALUES (
        'error_spike',
        alert_record.message,
        alert_record.error_hash,
        alert_record.total_hits,
        jsonb_build_object('window_minutes', 10)
      );
      alerts_created := alerts_created + 1;
    END IF;
  END LOOP;

  -- 2) High failure endpoint: same endpoint >= 10 failures in 10 min
  FOR alert_record IN
    SELECT api_endpoint, request_method, COUNT(*) as cnt, SUM(hit_count) as total_hits,
           (array_agg(message ORDER BY last_seen_at DESC))[1] as top_msg
    FROM error_logs
    WHERE last_seen_at > cutoff
      AND status = 'unresolved'
      AND api_endpoint IS NOT NULL
    GROUP BY api_endpoint, request_method
    HAVING SUM(hit_count) >= 10
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM admin_alerts
      WHERE trigger_type = 'endpoint_failure'
        AND top_error = alert_record.api_endpoint
        AND status = 'active'
        AND created_at > now() - interval '30 minutes'
    ) THEN
      INSERT INTO admin_alerts (trigger_type, top_error, hit_count, details)
      VALUES (
        'endpoint_failure',
        alert_record.api_endpoint,
        alert_record.total_hits,
        jsonb_build_object('method', alert_record.request_method, 'top_message', alert_record.top_msg)
      );
      alerts_created := alerts_created + 1;
    END IF;
  END LOOP;

  -- 3) Auth failure spike: auth-related errors >= 10 in 10 min
  SELECT COUNT(*), SUM(hit_count),
         (array_agg(message ORDER BY last_seen_at DESC))[1]
  INTO alert_record.cnt, alert_record.total_hits, alert_record.message
  FROM error_logs
  WHERE last_seen_at > cutoff
    AND status = 'unresolved'
    AND (message ILIKE '%auth%' OR message ILIKE '%login%' OR message ILIKE '%session%'
         OR api_endpoint ILIKE '%auth%' OR api_endpoint ILIKE '%token%');
  
  IF COALESCE(alert_record.total_hits, 0) >= 10 THEN
    IF NOT EXISTS (
      SELECT 1 FROM admin_alerts
      WHERE trigger_type = 'auth_failure'
        AND status = 'active'
        AND created_at > now() - interval '30 minutes'
    ) THEN
      INSERT INTO admin_alerts (trigger_type, top_error, hit_count, details)
      VALUES (
        'auth_failure',
        COALESCE(alert_record.message, 'Multiple auth failures'),
        alert_record.total_hits,
        jsonb_build_object('window_minutes', 10)
      );
      alerts_created := alerts_created + 1;
    END IF;
  END IF;

  RETURN jsonb_build_object('alerts_created', alerts_created);
END;
$$;
