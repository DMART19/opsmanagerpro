
CREATE OR REPLACE FUNCTION public.check_error_spikes()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  spike_window INTERVAL := '10 minutes';
  cutoff TIMESTAMPTZ := now() - spike_window;
  alert_record RECORD;
  alerts_created INTEGER := 0;
  result JSONB := '[]'::JSONB;
  auth_cnt INTEGER;
  auth_total_hits BIGINT;
  auth_top_message TEXT;
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
  SELECT COUNT(*), COALESCE(SUM(hit_count), 0),
         (array_agg(message ORDER BY last_seen_at DESC))[1]
  INTO auth_cnt, auth_total_hits, auth_top_message
  FROM error_logs
  WHERE last_seen_at > cutoff
    AND status = 'unresolved'
    AND (message ILIKE '%auth%' OR message ILIKE '%login%' OR message ILIKE '%session%'
         OR api_endpoint ILIKE '%auth%' OR api_endpoint ILIKE '%token%');
  
  IF COALESCE(auth_total_hits, 0) >= 10 THEN
    IF NOT EXISTS (
      SELECT 1 FROM admin_alerts
      WHERE trigger_type = 'auth_failure'
        AND status = 'active'
        AND created_at > now() - interval '30 minutes'
    ) THEN
      INSERT INTO admin_alerts (trigger_type, top_error, hit_count, details)
      VALUES (
        'auth_failure',
        COALESCE(auth_top_message, 'Multiple auth failures'),
        auth_total_hits,
        jsonb_build_object('window_minutes', 10)
      );
      alerts_created := alerts_created + 1;
    END IF;
  END IF;

  RETURN jsonb_build_object('alerts_created', alerts_created);
END;
$function$;
