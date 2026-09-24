
-- Drop the broken function
DROP FUNCTION IF EXISTS public.backfill_taxonomy_fks();

-- Create fixed backfill function
CREATE OR REPLACE FUNCTION public.backfill_taxonomy_fks()
RETURNS TABLE(domain_name TEXT, records_updated BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  cnt BIGINT;
BEGIN
  -- 1. manufacturer_id
  UPDATE cache_inventory ci SET manufacturer_id = m.id
  FROM manufacturers m
  WHERE ci.user_id = m.user_id AND lower(trim(ci.manufacturer)) = lower(trim(m.name))
    AND ci.manufacturer IS NOT NULL AND ci.manufacturer_id IS NULL;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  domain_name := 'manufacturer'; records_updated := cnt; RETURN NEXT;

  -- 2. asset_status_id
  UPDATE cache_inventory ci SET asset_status_id = s.id
  FROM asset_statuses s
  WHERE ci.user_id = s.user_id AND lower(trim(ci.status_item)) = lower(trim(s.name))
    AND ci.status_item IS NOT NULL AND ci.asset_status_id IS NULL;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  domain_name := 'asset_status'; records_updated := cnt; RETURN NEXT;

  -- 3. category_id
  UPDATE cache_inventory ci SET category_id = cc.id
  FROM custom_categories cc
  WHERE ci.user_id = cc.created_by AND lower(trim(ci.subcategory)) = lower(trim(cc.name))
    AND ci.subcategory IS NOT NULL AND ci.category_id IS NULL;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  domain_name := 'category'; records_updated := cnt; RETURN NEXT;

  -- 4. department_id
  UPDATE employees e SET department_id = d.id
  FROM departments d
  WHERE e.user_id = d.user_id AND lower(trim(e.department)) = lower(trim(d.name))
    AND e.department IS NOT NULL AND e.department_id IS NULL;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  domain_name := 'department'; records_updated := cnt; RETURN NEXT;

  -- 5. employee_status_id
  UPDATE employees e SET employee_status_id = es.id
  FROM employee_statuses es
  WHERE e.user_id = es.user_id AND lower(trim(e.status)) = lower(trim(es.name))
    AND e.status IS NOT NULL AND e.employee_status_id IS NULL;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  domain_name := 'employee_status'; records_updated := cnt; RETURN NEXT;

  -- 6. container_type_id
  UPDATE cache_boxes cb SET container_type_id = ct.id
  FROM container_types ct
  WHERE cb.user_id = ct.user_id AND lower(trim(cb.cache_box_type)) = lower(trim(ct.name))
    AND cb.container_type_id IS NULL;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  domain_name := 'container_type'; records_updated := cnt; RETURN NEXT;

  -- 7. container_status_id
  UPDATE cache_boxes cb SET container_status_id = cs.id
  FROM container_statuses cs
  WHERE cb.user_id = cs.user_id AND lower(trim(cb.status_cache_box)) = lower(trim(cs.name))
    AND cb.container_status_id IS NULL;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  domain_name := 'container_status'; records_updated := cnt; RETURN NEXT;

  -- 8. requirement_type_id
  UPDATE requirement_definitions rd SET requirement_type_id = rt.id
  FROM requirement_types rt
  WHERE rd.user_id = rt.user_id AND lower(trim(rd.requirement_type)) = lower(trim(rt.name))
    AND rd.requirement_type_id IS NULL;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  domain_name := 'requirement_type'; records_updated := cnt; RETURN NEXT;
END;
$$;
