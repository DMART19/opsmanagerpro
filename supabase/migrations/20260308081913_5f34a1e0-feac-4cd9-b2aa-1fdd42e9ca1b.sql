
-- Add deleted_at column to cache_inventory (assets + containers)
ALTER TABLE public.cache_inventory ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Add deleted_at column to employees (team members)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Create index for efficient filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_cache_inventory_deleted_at ON public.cache_inventory (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON public.employees (deleted_at) WHERE deleted_at IS NULL;

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_cache_inventory_deleted_expired ON public.cache_inventory (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_deleted_expired ON public.employees (deleted_at) WHERE deleted_at IS NOT NULL;

-- Function to permanently purge items deleted more than 30 days ago
CREATE OR REPLACE FUNCTION public.purge_soft_deleted_records()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv_count integer;
  emp_count integer;
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
  
  RETURN jsonb_build_object(
    'purged_assets', inv_count,
    'purged_employees', emp_count,
    'cutoff', cutoff
  );
END;
$$;

-- Function to restore a soft-deleted record
CREATE OR REPLACE FUNCTION public.restore_soft_deleted(p_table text, p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_table = 'cache_inventory' THEN
    UPDATE cache_inventory SET deleted_at = NULL, updated_at = now()
    WHERE id = p_id AND deleted_at IS NOT NULL AND user_id = auth.uid();
  ELSIF p_table = 'employees' THEN
    UPDATE employees SET deleted_at = NULL, updated_at = now()
    WHERE id = p_id AND deleted_at IS NOT NULL AND user_id = auth.uid();
  ELSE
    RETURN false;
  END IF;
  
  RETURN FOUND;
END;
$$;
