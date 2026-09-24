
-- 1. Flush all stale server-side cache entries immediately
TRUNCATE public.api_response_cache;

-- 2. Reset all cache versions to force fresh recomputation on next request
UPDATE public.api_cache_versions SET version = version + 1, updated_at = now();

-- 3. Add cache invalidation triggers for taxonomy tables that affect asset JOINs
-- When a manufacturer/status/group/category name changes, the cached payload is stale

DROP TRIGGER IF EXISTS trg_cache_invalidate_manufacturers ON public.manufacturers;
CREATE TRIGGER trg_cache_invalidate_manufacturers
AFTER INSERT OR UPDATE OR DELETE ON public.manufacturers
FOR EACH ROW EXECUTE FUNCTION public.bump_workspace_cache_version();

DROP TRIGGER IF EXISTS trg_cache_invalidate_asset_statuses ON public.asset_statuses;
CREATE TRIGGER trg_cache_invalidate_asset_statuses
AFTER INSERT OR UPDATE OR DELETE ON public.asset_statuses
FOR EACH ROW EXECUTE FUNCTION public.bump_workspace_cache_version();

DROP TRIGGER IF EXISTS trg_cache_invalidate_asset_groups ON public.asset_groups;
CREATE TRIGGER trg_cache_invalidate_asset_groups
AFTER INSERT OR UPDATE OR DELETE ON public.asset_groups
FOR EACH ROW EXECUTE FUNCTION public.bump_workspace_cache_version();

DROP TRIGGER IF EXISTS trg_cache_invalidate_custom_categories ON public.custom_categories;
CREATE TRIGGER trg_cache_invalidate_custom_categories
AFTER INSERT OR UPDATE OR DELETE ON public.custom_categories
FOR EACH ROW EXECUTE FUNCTION public.bump_workspace_cache_version();

DROP TRIGGER IF EXISTS trg_cache_invalidate_container_types ON public.container_types;
CREATE TRIGGER trg_cache_invalidate_container_types
AFTER INSERT OR UPDATE OR DELETE ON public.container_types
FOR EACH ROW EXECUTE FUNCTION public.bump_workspace_cache_version();

DROP TRIGGER IF EXISTS trg_cache_invalidate_container_statuses ON public.container_statuses;
CREATE TRIGGER trg_cache_invalidate_container_statuses
AFTER INSERT OR UPDATE OR DELETE ON public.container_statuses
FOR EACH ROW EXECUTE FUNCTION public.bump_workspace_cache_version();

DROP TRIGGER IF EXISTS trg_cache_invalidate_container_groups ON public.container_groups;
CREATE TRIGGER trg_cache_invalidate_container_groups
AFTER INSERT OR UPDATE OR DELETE ON public.container_groups
FOR EACH ROW EXECUTE FUNCTION public.bump_workspace_cache_version();

-- 4. Update bump_workspace_cache_version to handle taxonomy tables
-- These tables use user_id (not created_by) so the existing logic handles them,
-- but we need to map them to the correct cache resource
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
  -- Determine user_id from the row
  IF TG_TABLE_NAME = 'employee_requirements' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
    IF v_user_id IS NULL THEN
      SELECT e.user_id INTO v_user_id
      FROM public.employees e
      WHERE e.id = COALESCE(NEW.employee_id, OLD.employee_id)
      LIMIT 1;
    END IF;
  ELSIF TG_TABLE_NAME = 'custom_categories' THEN
    v_user_id := COALESCE(NEW.created_by, OLD.created_by);
  ELSE
    v_user_id := COALESCE(NEW.user_id, OLD.user_id, NEW.created_by, OLD.created_by);
  END IF;

  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Determine which cache resource to invalidate
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
  ELSIF TG_TABLE_NAME IN ('manufacturers', 'asset_statuses', 'asset_groups', 'custom_categories') THEN
    -- Taxonomy tables affect both assets and containers
    v_resource := 'assets_list';
    -- Also invalidate containers_list
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

  -- Bump version and delete cached payload
  INSERT INTO public.api_cache_versions (user_id, resource, version, updated_at)
  VALUES (v_user_id, v_resource, 2, now())
  ON CONFLICT (user_id, resource)
  DO UPDATE SET version = public.api_cache_versions.version + 1, updated_at = now();

  DELETE FROM public.api_response_cache
  WHERE user_id = v_user_id AND resource = v_resource;

  RETURN COALESCE(NEW, OLD);
END;
$$;
