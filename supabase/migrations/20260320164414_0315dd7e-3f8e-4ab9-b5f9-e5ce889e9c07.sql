
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
