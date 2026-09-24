
-- Phase 2: Unified asset model (drop FK first to avoid revalidation)

-- 0. Drop the container_id FK to cache_boxes first
ALTER TABLE public.cache_inventory
  DROP CONSTRAINT IF EXISTS cache_inventory_container_id_fkey;

-- 1. Clean orphaned container_id references
UPDATE public.cache_inventory
SET container_id = NULL
WHERE container_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.cache_boxes WHERE id = cache_inventory.container_id);

-- 2. Add new columns
ALTER TABLE public.cache_inventory
  ADD COLUMN IF NOT EXISTS asset_type text NOT NULL DEFAULT 'item',
  ADD COLUMN IF NOT EXISTS box_number text,
  ADD COLUMN IF NOT EXISTS box_number_alt text,
  ADD COLUMN IF NOT EXISTS container_type_id uuid REFERENCES public.container_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS container_status_id uuid REFERENCES public.container_statuses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS container_group_id uuid REFERENCES public.container_groups(id) ON DELETE SET NULL;

-- 3. Migrate cache_boxes data into cache_inventory
INSERT INTO public.cache_inventory (
  user_id, asset_type, box_number, box_number_alt, description, barcode,
  image_url, custom_data, container_type_id, container_status_id, container_group_id,
  section, created_at, updated_at, quantity_available, quantity_out, is_internal
)
SELECT
  cb.user_id, 'container', cb.box_number, cb.box_number_alt, cb.box_description,
  cb.barcode, cb.image_url, cb.custom_data, cb.container_type_id, cb.container_status_id,
  cb.container_group_id, ws.section_code, cb.created_at, cb.updated_at, 0, 0, false
FROM public.cache_boxes cb
LEFT JOIN public.warehouse_sections ws ON ws.id = cb.section_id;

-- 4. Remap container_id references from old cache_boxes IDs to new cache_inventory IDs
UPDATE public.cache_inventory ci_item
SET container_id = ci_container.id
FROM public.cache_inventory ci_container
JOIN public.cache_boxes cb ON cb.box_number = ci_container.box_number
  AND cb.user_id = ci_container.user_id
WHERE ci_item.container_id = cb.id
  AND ci_container.asset_type = 'container';

-- 5. Null out any remaining orphaned container_id refs
UPDATE public.cache_inventory SET container_id = NULL
WHERE container_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.cache_inventory ci2 WHERE ci2.id = cache_inventory.container_id AND ci2.asset_type = 'container');

-- 6. Add self-referencing FK
ALTER TABLE public.cache_inventory
  ADD CONSTRAINT cache_inventory_container_id_fkey
  FOREIGN KEY (container_id) REFERENCES public.cache_inventory(id) ON DELETE SET NULL;

-- 7. Index
CREATE INDEX IF NOT EXISTS idx_cache_inventory_asset_type ON public.cache_inventory(asset_type);

-- 8. Update prevent_taxonomy_delete to reference cache_inventory for container taxonomies
CREATE OR REPLACE FUNCTION public.prevent_taxonomy_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ref_count INTEGER;
  ref_table TEXT;
  ref_column TEXT;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'manufacturers' THEN ref_table := 'cache_inventory'; ref_column := 'manufacturer_id';
    WHEN 'custom_categories' THEN ref_table := 'cache_inventory'; ref_column := 'category_id';
    WHEN 'asset_statuses' THEN ref_table := 'cache_inventory'; ref_column := 'asset_status_id';
    WHEN 'asset_groups' THEN ref_table := 'cache_inventory'; ref_column := 'asset_group_id';
    WHEN 'container_types' THEN ref_table := 'cache_inventory'; ref_column := 'container_type_id';
    WHEN 'container_statuses' THEN ref_table := 'cache_inventory'; ref_column := 'container_status_id';
    WHEN 'container_groups' THEN ref_table := 'cache_inventory'; ref_column := 'container_group_id';
    WHEN 'departments' THEN ref_table := 'employees'; ref_column := 'department_id';
    WHEN 'employee_statuses' THEN ref_table := 'employees'; ref_column := 'employee_status_id';
    WHEN 'team_roles' THEN ref_table := 'employees'; ref_column := 'role_id';
    ELSE RETURN OLD;
  END CASE;

  EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE %I = $1', ref_table, ref_column)
    INTO ref_count
    USING OLD.id;

  IF ref_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete: this value is assigned to % record(s). Reassign before deleting.', ref_count;
  END IF;

  RETURN OLD;
END;
$function$;
