
-- Drop legacy string columns now that all data is migrated to FK references
-- cache_inventory: drop manufacturer, status_item, subcategory, group_abbv
ALTER TABLE public.cache_inventory
  DROP COLUMN IF EXISTS manufacturer,
  DROP COLUMN IF EXISTS status_item,
  DROP COLUMN IF EXISTS subcategory,
  DROP COLUMN IF EXISTS group_abbv;

-- employees: drop department, status
ALTER TABLE public.employees
  DROP COLUMN IF EXISTS department,
  DROP COLUMN IF EXISTS status;

-- cache_boxes: drop cache_box_type, status_cache_box, x_group_display
ALTER TABLE public.cache_boxes
  DROP COLUMN IF EXISTS cache_box_type,
  DROP COLUMN IF EXISTS status_cache_box,
  DROP COLUMN IF EXISTS x_group_display;

-- requirement_definitions: drop requirement_type
ALTER TABLE public.requirement_definitions
  DROP COLUMN IF EXISTS requirement_type;

-- Clean up the backfill function
DROP FUNCTION IF EXISTS public.backfill_taxonomy_fks();
