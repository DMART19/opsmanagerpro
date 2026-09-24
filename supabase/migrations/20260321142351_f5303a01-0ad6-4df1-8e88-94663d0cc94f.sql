
CREATE OR REPLACE FUNCTION public.bump_workspace_cache_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_resource text;
  v_new jsonb;
  v_old jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
  ELSE
    v_new := to_jsonb(NEW);
    v_old := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
  END IF;

  IF TG_TABLE_NAME = 'employee_requirements' THEN
    v_user_id := COALESCE((v_new->>'user_id')::uuid, (v_old->>'user_id')::uuid);
    IF v_user_id IS NULL THEN
      SELECT e.user_id INTO v_user_id
      FROM public.employees e
      WHERE e.id = COALESCE((v_new->>'employee_id')::uuid, (v_old->>'employee_id')::uuid)
      LIMIT 1;
    END IF;
  ELSIF TG_TABLE_NAME = 'custom_categories' THEN
    v_user_id := COALESCE((v_new->>'created_by')::uuid, (v_old->>'created_by')::uuid);
  ELSE
    v_user_id := COALESCE(
      (v_new->>'user_id')::uuid,
      (v_old->>'user_id')::uuid,
      (v_new->>'created_by')::uuid,
      (v_old->>'created_by')::uuid
    );
  END IF;

  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'cache_inventory' THEN
    -- Always bump assets_list since the RPC returns both items and containers
    v_resource := 'assets_list';

    -- Also bump containers_list for any dedicated container queries
    IF COALESCE((v_new->>'asset_type'), (v_old->>'asset_type')) = 'container' THEN
      INSERT INTO public.api_cache_versions (user_id, resource, version, updated_at)
      VALUES (v_user_id, 'containers_list', 2, now())
      ON CONFLICT (user_id, resource)
      DO UPDATE SET version = public.api_cache_versions.version + 1, updated_at = now();
      DELETE FROM public.api_response_cache
      WHERE user_id = v_user_id AND resource = 'containers_list';
    END IF;
  ELSIF TG_TABLE_NAME = 'cache_boxes' THEN
    v_resource := 'containers_list';
  ELSIF TG_TABLE_NAME IN ('employees', 'employee_requirements') THEN
    v_resource := 'team_members_list';
  ELSIF TG_TABLE_NAME = 'certifications' THEN
    v_resource := 'credentials_list';
  ELSIF TG_TABLE_NAME IN ('workspace_settings', 'notification_settings', 'asset_settings') THEN
    v_resource := 'workspace_configuration';
  ELSIF TG_TABLE_NAME IN ('manufacturers', 'asset_statuses', 'asset_groups', 'custom_categories') THEN
    v_resource := 'assets_list';
    INSERT INTO public.api_cache_versions (user_id, resource, version, updated_at)
    VALUES (v_user_id, 'containers_list', 2, now())
    ON CONFLICT (user_id, resource)
    DO UPDATE SET version = public.api_cache_versions.version + 1, updated_at = now();
    DELETE FROM public.api_response_cache
    WHERE user_id = v_user_id AND resource = 'containers_list';
  ELSIF TG_TABLE_NAME IN ('container_types', 'container_statuses', 'container_groups') THEN
    v_resource := 'containers_list';
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
