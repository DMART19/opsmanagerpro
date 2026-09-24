
-- Migrate existing "Missing" status to "Assigned" 
UPDATE public.employee_requirements SET status = 'Assigned' WHERE status = 'Missing';

-- Update the RPC to separate "Assigned" (neutral) from "Expired" (alarming)
CREATE OR REPLACE FUNCTION public.get_cached_team_members_list()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_resource text := 'team_members_list';
  v_current_version bigint;
  v_cached_payload jsonb;
  v_cached_version bigint;
  v_cached_expires_at timestamptz;
  v_payload jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_current_version := public.get_or_init_cache_version(v_user_id, v_resource);

  SELECT payload, version, expires_at
  INTO v_cached_payload, v_cached_version, v_cached_expires_at
  FROM public.api_response_cache
  WHERE user_id = v_user_id AND resource = v_resource;

  IF v_cached_payload IS NOT NULL
    AND v_cached_version = v_current_version
    AND v_cached_expires_at > now() THEN
    RETURN v_cached_payload;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_payload
  FROM (
    SELECT
      e.id,
      e.first_name,
      e.last_name,
      e.email,
      e.phone,
      e.position,
      e.employee_id,
      e.fema_id,
      e.hire_date,
      e.notes,
      e.avatar_url,
      e.base_location,
      e.tags,
      e.custom_data,
      e.role_id,
      e.department_id,
      e.employee_status_id,
      e.user_id,
      e.created_at,
      e.updated_at,
      d.name AS department,
      COALESCE(es.name, 'Active') AS status,
      jsonb_build_object(
        'compliant', COALESCE(req.compliant_count, 0),
        'expiring_soon', COALESCE(req.expiring_soon_count, 0),
        'missing_expired', COALESCE(req.expired_count, 0),
        'pending', COALESCE(req.pending_count, 0),
        'total', COALESCE(req.total_count, 0)
      ) AS requirements_stats
    FROM public.employees e
    LEFT JOIN public.departments d ON d.id = e.department_id
    LEFT JOIN public.employee_statuses es ON es.id = e.employee_status_id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS total_count,
        COUNT(*) FILTER (WHERE er.status = 'Compliant')::int AS compliant_count,
        COUNT(*) FILTER (
          WHERE er.status = 'Compliant'
            AND er.expire_date IS NOT NULL
            AND er.expire_date > CURRENT_DATE
            AND er.expire_date <= (CURRENT_DATE + interval '60 days')
        )::int AS expiring_soon_count,
        COUNT(*) FILTER (WHERE er.status = 'Expired')::int AS expired_count,
        COUNT(*) FILTER (WHERE er.status IN ('Assigned', 'Missing'))::int AS pending_count
      FROM public.employee_requirements er
      WHERE er.employee_id = e.id
    ) req ON true
    WHERE e.user_id = v_user_id
      AND e.deleted_at IS NULL
    ORDER BY e.created_at DESC
    LIMIT 10000
  ) t;

  INSERT INTO public.api_response_cache (user_id, resource, payload, version, expires_at, updated_at)
  VALUES (v_user_id, v_resource, v_payload, v_current_version, now() + interval '5 minutes', now())
  ON CONFLICT (user_id, resource)
  DO UPDATE SET
    payload = EXCLUDED.payload,
    version = EXCLUDED.version,
    expires_at = EXCLUDED.expires_at,
    updated_at = now();

  RETURN v_payload;
END;
$$;
