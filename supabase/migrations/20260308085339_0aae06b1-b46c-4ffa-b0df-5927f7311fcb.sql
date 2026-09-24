
-- Add deleted_at to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Add deleted_at to pallets table  
ALTER TABLE public.pallets ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Add deleted_at to certifications table
ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Update restore_soft_deleted to handle new tables
CREATE OR REPLACE FUNCTION public.restore_soft_deleted(p_table text, p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_table = 'cache_inventory' THEN
    UPDATE cache_inventory SET deleted_at = NULL, updated_at = now()
    WHERE id = p_id AND deleted_at IS NOT NULL AND user_id = auth.uid();
  ELSIF p_table = 'employees' THEN
    UPDATE employees SET deleted_at = NULL, updated_at = now()
    WHERE id = p_id AND deleted_at IS NOT NULL AND user_id = auth.uid();
  ELSIF p_table = 'tasks' THEN
    UPDATE tasks SET deleted_at = NULL, updated_at = now()
    WHERE id = p_id AND deleted_at IS NOT NULL AND user_id = auth.uid();
  ELSIF p_table = 'pallets' THEN
    UPDATE pallets SET deleted_at = NULL, updated_at = now()
    WHERE id = p_id AND deleted_at IS NOT NULL AND created_by = auth.uid();
  ELSIF p_table = 'certifications' THEN
    UPDATE certifications SET deleted_at = NULL, updated_at = now()
    WHERE id = p_id AND deleted_at IS NOT NULL AND created_by = auth.uid();
  ELSE
    RETURN false;
  END IF;
  
  RETURN FOUND;
END;
$function$;

-- Update purge_soft_deleted_records to handle new tables
CREATE OR REPLACE FUNCTION public.purge_soft_deleted_records()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv_count integer;
  emp_count integer;
  task_count integer;
  pallet_count integer;
  cert_count integer;
  cutoff timestamptz := now() - interval '30 days';
BEGIN
  -- Delete related records first for cache_inventory
  DELETE FROM asset_attribute_values WHERE asset_id IN (
    SELECT id FROM cache_inventory WHERE deleted_at IS NOT NULL AND deleted_at < cutoff
  );
  DELETE FROM item_checkouts WHERE item_id IN (
    SELECT id FROM cache_inventory WHERE deleted_at IS NOT NULL AND deleted_at < cutoff
  );
  
  -- Purge inventory
  DELETE FROM cache_inventory WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS inv_count = ROW_COUNT;
  
  -- Delete related records for employees
  DELETE FROM employee_requirements WHERE employee_id IN (
    SELECT id FROM employees WHERE deleted_at IS NOT NULL AND deleted_at < cutoff
  );
  
  -- Purge employees
  DELETE FROM employees WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS emp_count = ROW_COUNT;

  -- Purge tasks
  DELETE FROM tasks WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS task_count = ROW_COUNT;

  -- Delete related records for pallets (cases, items)
  DELETE FROM items WHERE pallet_id IN (
    SELECT id FROM pallets WHERE deleted_at IS NOT NULL AND deleted_at < cutoff
  );
  DELETE FROM cases WHERE pallet_id IN (
    SELECT id FROM pallets WHERE deleted_at IS NOT NULL AND deleted_at < cutoff
  );
  DELETE FROM pallets WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS pallet_count = ROW_COUNT;

  -- Purge certifications
  DELETE FROM certifications WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS cert_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'purged_assets', inv_count,
    'purged_employees', emp_count,
    'purged_tasks', task_count,
    'purged_pallets', pallet_count,
    'purged_certifications', cert_count,
    'cutoff', cutoff
  );
END;
$function$;
