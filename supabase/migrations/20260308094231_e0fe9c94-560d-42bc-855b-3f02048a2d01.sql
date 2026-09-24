
-- ============================================================
-- INCIDENT MANAGEMENT & OBSERVABILITY
-- ============================================================

-- 1. Incidents table
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  affected_component TEXT NOT NULL, -- 'api', 'database', 'auth', 'background_jobs', 'frontend', 'storage'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  status TEXT NOT NULL DEFAULT 'detected', -- 'detected', 'investigating', 'mitigating', 'resolved', 'post_mortem'
  detection_method TEXT DEFAULT 'manual', -- 'auto_spike', 'auto_latency', 'auto_auth', 'manual'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  impact_summary TEXT,
  error_count INTEGER DEFAULT 0,
  affected_users INTEGER DEFAULT 0,
  related_alert_ids UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_read_incidents" ON incidents
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "super_admin_insert_incidents" ON incidents
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "super_admin_update_incidents" ON incidents
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_started ON incidents(started_at DESC);
CREATE INDEX idx_incidents_component ON incidents(affected_component);

-- Auto-update updated_at
CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Incident timeline entries (append-only)
CREATE TABLE public.incident_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL DEFAULT 'note', -- 'status_change', 'note', 'detection', 'escalation', 'resolution'
  message TEXT NOT NULL,
  author_id UUID,
  previous_status TEXT,
  new_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_read_timeline" ON incident_timeline
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "super_admin_insert_timeline" ON incident_timeline
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- Immutable timeline
CREATE TRIGGER trg_prevent_timeline_update
  BEFORE UPDATE ON incident_timeline
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trg_prevent_timeline_delete
  BEFORE DELETE ON incident_timeline
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

CREATE INDEX idx_timeline_incident ON incident_timeline(incident_id, created_at DESC);

-- 3. Observability metrics RPC
CREATE OR REPLACE FUNCTION public.get_observability_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
  _error_rate_1h int;
  _error_rate_24h int;
  _auth_failures_1h int;
  _auth_failures_24h int;
  _errors_by_route jsonb;
  _error_trend jsonb;
  _active_incidents int;
  _open_alerts int;
  _total_errors_7d int;
  _critical_errors_24h int;
  _unique_users_affected int;
BEGIN
  -- Error rates
  SELECT COUNT(*) INTO _error_rate_1h
  FROM error_logs WHERE last_seen_at > now() - interval '1 hour' AND status = 'unresolved';

  SELECT COUNT(*) INTO _error_rate_24h
  FROM error_logs WHERE last_seen_at > now() - interval '24 hours' AND status = 'unresolved';

  SELECT COUNT(*) INTO _total_errors_7d
  FROM error_logs WHERE last_seen_at > now() - interval '7 days';

  SELECT COUNT(*) INTO _critical_errors_24h
  FROM error_logs WHERE last_seen_at > now() - interval '24 hours' AND severity = 'critical';

  -- Auth failures
  SELECT COUNT(*) INTO _auth_failures_1h
  FROM error_logs WHERE last_seen_at > now() - interval '1 hour'
    AND (message ILIKE '%auth%' OR message ILIKE '%login%' OR message ILIKE '%unauthorized%'
         OR api_endpoint ILIKE '%auth%' OR api_status_code = 401);

  SELECT COUNT(*) INTO _auth_failures_24h
  FROM error_logs WHERE last_seen_at > now() - interval '24 hours'
    AND (message ILIKE '%auth%' OR message ILIKE '%login%' OR message ILIKE '%unauthorized%'
         OR api_endpoint ILIKE '%auth%' OR api_status_code = 401);

  -- Errors by route (top 10)
  SELECT COALESCE(jsonb_agg(r), '[]'::jsonb) INTO _errors_by_route
  FROM (
    SELECT jsonb_build_object(
      'route', COALESCE(page_route, 'unknown'),
      'count', SUM(hit_count),
      'last_seen', MAX(last_seen_at)
    ) as r
    FROM error_logs
    WHERE last_seen_at > now() - interval '24 hours'
    GROUP BY page_route
    ORDER BY SUM(hit_count) DESC
    LIMIT 10
  ) sub;

  -- Error trend (hourly buckets for last 24h)
  SELECT COALESCE(jsonb_agg(r ORDER BY hour), '[]'::jsonb) INTO _error_trend
  FROM (
    SELECT jsonb_build_object(
      'hour', date_trunc('hour', last_seen_at),
      'count', COUNT(*),
      'hits', SUM(hit_count)
    ) as r, date_trunc('hour', last_seen_at) as hour
    FROM error_logs
    WHERE last_seen_at > now() - interval '24 hours'
    GROUP BY date_trunc('hour', last_seen_at)
  ) sub;

  -- Active incidents
  SELECT COUNT(*) INTO _active_incidents
  FROM incidents WHERE status NOT IN ('resolved', 'post_mortem');

  -- Open alerts
  SELECT COUNT(*) INTO _open_alerts
  FROM admin_alerts WHERE status = 'active';

  -- Unique affected users (24h)
  SELECT COUNT(DISTINCT user_id) INTO _unique_users_affected
  FROM error_logs WHERE last_seen_at > now() - interval '24 hours' AND user_id IS NOT NULL;

  _result := jsonb_build_object(
    'assessed_at', now(),
    'error_rates', jsonb_build_object(
      'last_1h', _error_rate_1h,
      'last_24h', _error_rate_24h,
      'last_7d', _total_errors_7d,
      'critical_24h', _critical_errors_24h
    ),
    'auth_failures', jsonb_build_object(
      'last_1h', _auth_failures_1h,
      'last_24h', _auth_failures_24h
    ),
    'errors_by_route', _errors_by_route,
    'error_trend', _error_trend,
    'active_incidents', _active_incidents,
    'open_alerts', _open_alerts,
    'affected_users_24h', _unique_users_affected
  );

  RETURN _result;
END;
$$;

-- 4. Auto-detect incidents from error spikes
CREATE OR REPLACE FUNCTION public.detect_incidents()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _created int := 0;
  _spike RECORD;
  _incident_id uuid;
BEGIN
  -- Detect error spike incidents (>= 20 hits in 15 min on same endpoint)
  FOR _spike IN
    SELECT
      COALESCE(api_endpoint, page_route, 'unknown') as component,
      COUNT(*) as error_count,
      SUM(hit_count) as total_hits,
      COUNT(DISTINCT user_id) as affected_users,
      (array_agg(message ORDER BY last_seen_at DESC))[1] as top_message,
      MIN(last_seen_at) as first_seen
    FROM error_logs
    WHERE last_seen_at > now() - interval '15 minutes'
      AND status = 'unresolved'
    GROUP BY COALESCE(api_endpoint, page_route, 'unknown')
    HAVING SUM(hit_count) >= 20
  LOOP
    -- Skip if already have an active incident for this component
    IF NOT EXISTS (
      SELECT 1 FROM incidents
      WHERE affected_component = _spike.component
        AND status NOT IN ('resolved', 'post_mortem')
        AND detected_at > now() - interval '1 hour'
    ) THEN
      INSERT INTO incidents (
        title, description, affected_component, severity,
        status, detection_method, started_at, detected_at,
        error_count, affected_users, metadata
      ) VALUES (
        'Error spike: ' || _spike.component,
        'Automated detection: ' || _spike.total_hits || ' error hits in 15 minutes. Top error: ' || LEFT(_spike.top_message, 200),
        _spike.component,
        CASE WHEN _spike.total_hits >= 50 THEN 'critical' WHEN _spike.total_hits >= 30 THEN 'high' ELSE 'medium' END,
        'detected',
        'auto_spike',
        _spike.first_seen,
        now(),
        _spike.error_count,
        _spike.affected_users,
        jsonb_build_object('total_hits', _spike.total_hits, 'top_message', _spike.top_message)
      ) RETURNING id INTO _incident_id;

      -- Add timeline entry
      INSERT INTO incident_timeline (incident_id, entry_type, message)
      VALUES (_incident_id, 'detection', 'Auto-detected error spike: ' || _spike.total_hits || ' hits on ' || _spike.component);

      _created := _created + 1;
    END IF;
  END LOOP;

  -- Detect auth failure incidents (>= 15 auth errors in 15 min)
  DECLARE
    _auth_count int;
    _auth_hits bigint;
    _auth_users int;
  BEGIN
    SELECT COUNT(*), COALESCE(SUM(hit_count), 0), COUNT(DISTINCT user_id)
    INTO _auth_count, _auth_hits, _auth_users
    FROM error_logs
    WHERE last_seen_at > now() - interval '15 minutes'
      AND status = 'unresolved'
      AND (message ILIKE '%auth%' OR message ILIKE '%login%' OR api_status_code = 401);

    IF _auth_hits >= 15 AND NOT EXISTS (
      SELECT 1 FROM incidents
      WHERE affected_component = 'auth'
        AND status NOT IN ('resolved', 'post_mortem')
        AND detected_at > now() - interval '1 hour'
    ) THEN
      INSERT INTO incidents (
        title, description, affected_component, severity,
        status, detection_method, error_count, affected_users
      ) VALUES (
        'Authentication failure spike',
        'Automated detection: ' || _auth_hits || ' auth failures in 15 minutes across ' || _auth_users || ' users',
        'auth',
        CASE WHEN _auth_hits >= 50 THEN 'critical' ELSE 'high' END,
        'detected',
        'auto_auth',
        _auth_count,
        _auth_users
      ) RETURNING id INTO _incident_id;

      INSERT INTO incident_timeline (incident_id, entry_type, message)
      VALUES (_incident_id, 'detection', 'Auto-detected auth failure spike: ' || _auth_hits || ' failures');

      _created := _created + 1;
    END IF;
  END;

  RETURN jsonb_build_object('incidents_created', _created);
END;
$$;
