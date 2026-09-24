-- Backend response caching for frequently accessed workspace datasets
-- Resources: assets_list, containers_list, team_members_list, credentials_list, workspace_configuration

CREATE TABLE IF NOT EXISTS public.api_cache_versions (
  user_id uuid NOT NULL,
  resource text NOT NULL,
  version bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resource)
);

ALTER TABLE public.api_cache_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'api_cache_versions' AND policyname = 'Users can read own cache versions'
  ) THEN
    CREATE POLICY "Users can read own cache versions"
    ON public.api_cache_versions
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.api_response_cache (
  user_id uuid NOT NULL,
  resource text NOT NULL,
  payload jsonb NOT NULL,
  version bigint NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resource)
);

ALTER TABLE public.api_response_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'api_response_cache' AND policyname = 'Users can read own cached responses'
  ) THEN
    CREATE POLICY "Users can read own cached responses"
    ON public.api_response_cache
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_or_init_cache_version(p_user_id uuid, p_resource text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version bigint;
BEGIN
  INSERT INTO public.api_cache_versions (user_id, resource, version)
  VALUES (p_user_id, p_resource, 1)
  ON CONFLICT (user_id, resource) DO NOTHING;

  SELECT version INTO v_version
  FROM public.api_cache_versions
  WHERE user_id = p_user_id AND resource = p_resource;

  RETURN COALESCE(v_version, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cached_assets_list()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_resource text := 'assets_list';
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
      ci.id,
      ci.id_cache_fema,
      ci.id_cache_tf,
      ci.barcode,
      ci.section,
      ci.description,
      ci.model_part_num,
      ci.serial_number,
      ci.date_expire,
      COALESCE(ci.quantity_out, 0) AS quantity_out,
      COALESCE(ci.quantity_available, 0) AS quantity_available,
      COALESCE(ci.is_internal, false) AS is_internal,
      ci.group_year,
      ci.created_at,
      ci.updated_at,
      ci.user_id,
      ci.low_stock_threshold,
      ci.critical_stock_threshold,
      ci.container_id,
      ci.image_url,
      ci.custom_data,
      ci.manufacturer_id,
      ci.asset_status_id,
      ci.asset_group_id,
      ci.category_id,
      ci.container_type_id,
      ci.container_status_id,
      ci.container_group_id,
      ci.asset_type,
      ci.box_number,
      ci.box_number_alt,
      cat.name AS subcategory,
      man.name AS manufacturer,
      st.name AS status_item,
      grp.name AS group_abbv,
      ctype.name AS container_type_name,
      cstatus.name AS container_status_name,
      cgroup.name AS container_group_name
    FROM public.cache_inventory ci
    LEFT JOIN public.custom_categories cat ON cat.id = ci.category_id
    LEFT JOIN public.manufacturers man ON man.id = ci.manufacturer_id
    LEFT JOIN public.asset_statuses st ON st.id = ci.asset_status_id
    LEFT JOIN public.asset_groups grp ON grp.id = ci.asset_group_id
    LEFT JOIN public.container_types ctype ON ctype.id = ci.container_type_id
    LEFT JOIN public.container_statuses cstatus ON cstatus.id = ci.container_status_id
    LEFT JOIN public.container_groups cgroup ON cgroup.id = ci.container_group_id
    WHERE ci.user_id = v_user_id
      AND ci.deleted_at IS NULL
      AND ci.asset_type = 'item'
    ORDER BY ci.created_at DESC
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

CREATE OR REPLACE FUNCTION public.get_cached_containers_list()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_resource text := 'containers_list';
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
      cb.id,
      cb.box_number,
      cb.box_number_alt,
      ct.name AS cache_box_type,
      cs.name AS status_cache_box,
      cb.barcode,
      cb.box_description,
      cg.name AS x_group_display,
      cb.section_id,
      cb.created_at,
      cb.updated_at,
      cb.created_by,
      cb.item_count,
      cb.custom_data,
      cb.container_type_id,
      cb.container_status_id,
      cb.container_group_id,
      ws.section_name,
      ws.section_code
    FROM public.cache_boxes cb
    LEFT JOIN public.container_types ct ON ct.id = cb.container_type_id
    LEFT JOIN public.container_statuses cs ON cs.id = cb.container_status_id
    LEFT JOIN public.container_groups cg ON cg.id = cb.container_group_id
    LEFT JOIN public.warehouse_sections ws ON ws.id = cb.section_id
    WHERE cb.user_id = v_user_id
    ORDER BY cb.created_at DESC
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
        'missing_expired', COALESCE(req.missing_expired_count, 0),
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
        COUNT(*) FILTER (WHERE er.status IN ('Missing', 'Expired'))::int AS missing_expired_count
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

CREATE OR REPLACE FUNCTION public.get_cached_credentials_list()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_resource text := 'credentials_list';
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
      c.id,
      c.name,
      c.certification_number,
      c.certification_type,
      c.issue_date,
      c.expiry_date,
      c.status,
      c.issuing_organization,
      c.document_url,
      c.notes,
      c.staff_id,
      c.created_at,
      c.updated_at,
      jsonb_build_object(
        'id', s.id,
        'first_name', s.first_name,
        'last_name', s.last_name,
        'email', s.email
      ) AS staff
    FROM public.certifications c
    LEFT JOIN public.staff s ON s.id = c.staff_id
    WHERE c.created_by = v_user_id
      AND c.deleted_at IS NULL
    ORDER BY c.expiry_date ASC NULLS LAST
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

CREATE OR REPLACE FUNCTION public.get_cached_workspace_configuration()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_resource text := 'workspace_configuration';
  v_current_version bigint;
  v_cached_payload jsonb;
  v_cached_version bigint;
  v_cached_expires_at timestamptz;
  v_payload jsonb;
  v_workspace jsonb;
  v_notifications jsonb;
  v_assets jsonb;
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

  SELECT to_jsonb(ws) INTO v_workspace
  FROM public.workspace_settings ws
  WHERE ws.user_id = v_user_id
  LIMIT 1;

  SELECT to_jsonb(ns) INTO v_notifications
  FROM public.notification_settings ns
  WHERE ns.user_id = v_user_id
  LIMIT 1;

  SELECT to_jsonb(aset) INTO v_assets
  FROM public.asset_settings aset
  WHERE aset.user_id = v_user_id
  LIMIT 1;

  v_payload := jsonb_build_object(
    'workspace_settings', COALESCE(v_workspace, 'null'::jsonb),
    'notification_settings', COALESCE(v_notifications, 'null'::jsonb),
    'asset_settings', COALESCE(v_assets, 'null'::jsonb)
  );

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

CREATE OR REPLACE FUNCTION public.bump_workspace_cache_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_resource text;
BEGIN
  IF TG_TABLE_NAME = 'employee_requirements' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
    IF v_user_id IS NULL THEN
      SELECT e.user_id INTO v_user_id
      FROM public.employees e
      WHERE e.id = COALESCE(NEW.employee_id, OLD.employee_id)
      LIMIT 1;
    END IF;
  ELSE
    v_user_id := COALESCE(NEW.user_id, OLD.user_id, NEW.created_by, OLD.created_by);
  END IF;

  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'cache_inventory' THEN
    IF COALESCE(NEW.asset_type, OLD.asset_type) = 'item' THEN
      v_resource := 'assets_list';
    ELSE
      v_resource := 'containers_list';
    END IF;
  ELSIF TG_TABLE_NAME = 'cache_boxes' THEN
    v_resource := 'containers_list';
  ELSIF TG_TABLE_NAME IN ('employees', 'employee_requirements') THEN
    v_resource := 'team_members_list';
  ELSIF TG_TABLE_NAME = 'certifications' THEN
    v_resource := 'credentials_list';
  ELSIF TG_TABLE_NAME IN ('workspace_settings', 'notification_settings', 'asset_settings') THEN
    v_resource := 'workspace_configuration';
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.api_cache_versions (user_id, resource, version, updated_at)
  VALUES (v_user_id, v_resource, 2, now())
  ON CONFLICT (user_id, resource)
  DO UPDATE SET version = public.api_cache_versions.version + 1, updated_at = now();

  DELETE FROM public.api_response_cache
  WHERE user_id = v_user_id AND resource = v_resource;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_cache_invalidate_cache_inventory ON public.cache_inventory;
CREATE TRIGGER trg_cache_invalidate_cache_inventory
AFTER INSERT OR UPDATE OR DELETE ON public.cache_inventory
FOR EACH ROW EXECUTE FUNCTION public.bump_workspace_cache_version();

DROP TRIGGER IF EXISTS trg_cache_invalidate_cache_boxes ON public.cache_boxes;
CREATE TRIGGER trg_cache_invalidate_cache_boxes
AFTER INSERT OR UPDATE OR DELETE ON public.cache_boxes
FOR EACH ROW EXECUTE FUNCTION public.bump_workspace_cache_version();

DROP TRIGGER IF EXISTS trg_cache_invalidate_employees ON public.employees;
CREATE TRIGGER trg_cache_invalidate_employees
AFTER INSERT OR UPDATE OR DELETE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.bump_workspace_cache_version();

DROP TRIGGER IF EXISTS trg_cache_invalidate_employee_requirements ON public.employee_requirements;
CREATE TRIGGER trg_cache_invalidate_employee_requirements
AFTER INSERT OR UPDATE OR DELETE ON public.employee_requirements
FOR EACH ROW EXECUTE FUNCTION public.bump_workspace_cache_version();

DROP TRIGGER IF EXISTS trg_cache_invalidate_certifications ON public.certifications;
CREATE TRIGGER trg_cache_invalidate_certifications
AFTER INSERT OR UPDATE OR DELETE ON public.certifications
FOR EACH ROW EXECUTE FUNCTION public.bump_workspace_cache_version();

DROP TRIGGER IF EXISTS trg_cache_invalidate_workspace_settings ON public.workspace_settings;
CREATE TRIGGER trg_cache_invalidate_workspace_settings
AFTER INSERT OR UPDATE OR DELETE ON public.workspace_settings
FOR EACH ROW EXECUTE FUNCTION public.bump_workspace_cache_version();

DROP TRIGGER IF EXISTS trg_cache_invalidate_notification_settings ON public.notification_settings;
CREATE TRIGGER trg_cache_invalidate_notification_settings
AFTER INSERT OR UPDATE OR DELETE ON public.notification_settings
FOR EACH ROW EXECUTE FUNCTION public.bump_workspace_cache_version();

DROP TRIGGER IF EXISTS trg_cache_invalidate_asset_settings ON public.asset_settings;
CREATE TRIGGER trg_cache_invalidate_asset_settings
AFTER INSERT OR UPDATE OR DELETE ON public.asset_settings
FOR EACH ROW EXECUTE FUNCTION public.bump_workspace_cache_version();