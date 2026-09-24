
-- Enhance workspace_snapshots table with full data capture
ALTER TABLE public.workspace_snapshots 
  ADD COLUMN IF NOT EXISTS snapshot_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS snapshot_size integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS container_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credential_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pallet_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_area_count integer DEFAULT 0;

-- Create a DB function that captures a full snapshot for a given user
CREATE OR REPLACE FUNCTION public.create_workspace_snapshot(
  p_user_id uuid,
  p_name text DEFAULT 'Auto Snapshot',
  p_snapshot_type text DEFAULT 'manual'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_assets jsonb;
  v_containers jsonb;
  v_employees jsonb;
  v_tasks jsonb;
  v_pallets jsonb;
  v_credentials jsonb;
  v_storage_areas jsonb;
  v_snapshot_data jsonb;
  v_snapshot_size int;
  v_snapshot_id uuid;
  v_asset_count int;
  v_container_count int;
  v_employee_count int;
  v_task_count int;
  v_pallet_count int;
  v_credential_count int;
  v_storage_area_count int;
BEGIN
  -- Capture assets (items only)
  SELECT COALESCE(jsonb_agg(to_jsonb(r) - 'custom_data' - 'image_url'), '[]'::jsonb)
  INTO v_assets
  FROM (
    SELECT id, description, asset_type, box_number, box_number_alt, barcode,
           quantity_available, quantity_out, section, container_id, category_id,
           manufacturer_id, asset_status_id, asset_group_id, date_expire,
           serial_number, model_part_num, id_cache_fema, id_cache_tf,
           low_stock_threshold, critical_stock_threshold
    FROM cache_inventory
    WHERE user_id = p_user_id AND deleted_at IS NULL AND asset_type = 'item'
  ) r;
  v_asset_count := jsonb_array_length(v_assets);

  -- Capture containers
  SELECT COALESCE(jsonb_agg(to_jsonb(r) - 'custom_data' - 'image_url'), '[]'::jsonb)
  INTO v_containers
  FROM (
    SELECT id, description, asset_type, box_number, box_number_alt, barcode,
           quantity_available, quantity_out, section, container_id, category_id,
           container_type_id, container_status_id, container_group_id
    FROM cache_inventory
    WHERE user_id = p_user_id AND deleted_at IS NULL AND asset_type = 'container'
  ) r;
  v_container_count := jsonb_array_length(v_containers);

  -- Capture employees
  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
  INTO v_employees
  FROM (
    SELECT id, first_name, last_name, email, phone, position, employee_id,
           department_id, role_id, employee_status_id, hire_date, base_location, tags
    FROM employees
    WHERE user_id = p_user_id AND deleted_at IS NULL
  ) r;
  v_employee_count := jsonb_array_length(v_employees);

  -- Capture tasks
  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
  INTO v_tasks
  FROM (
    SELECT id, title, description, task_type, status, priority, start_date,
           end_date, completed_at, assigned_to
    FROM tasks
    WHERE user_id = p_user_id AND deleted_at IS NULL
  ) r;
  v_task_count := jsonb_array_length(v_tasks);

  -- Capture pallets
  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
  INTO v_pallets
  FROM (
    SELECT id, pallet_id, pallet_type, status, current_weight, max_capacity, section_id
    FROM pallets
    WHERE created_by = p_user_id AND deleted_at IS NULL
  ) r;
  v_pallet_count := jsonb_array_length(v_pallets);

  -- Capture credentials/certifications
  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
  INTO v_credentials
  FROM (
    SELECT id, name, certification_type, certification_number, staff_id,
           issue_date, expiry_date, issuing_organization, status
    FROM certifications
    WHERE created_by = p_user_id AND deleted_at IS NULL
  ) r;
  v_credential_count := jsonb_array_length(v_credentials);

  -- Capture storage areas (warehouse sections)
  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
  INTO v_storage_areas
  FROM (
    SELECT ws.id, ws.name, ws.warehouse_id, w.name as warehouse_name
    FROM warehouse_sections ws
    JOIN warehouses w ON w.id = ws.warehouse_id
    WHERE ws.created_by = p_user_id
  ) r;
  v_storage_area_count := jsonb_array_length(v_storage_areas);

  -- Assemble full snapshot
  v_snapshot_data := jsonb_build_object(
    'assets', v_assets,
    'containers', v_containers,
    'employees', v_employees,
    'tasks', v_tasks,
    'pallets', v_pallets,
    'credentials', v_credentials,
    'storage_areas', v_storage_areas,
    'captured_at', now()
  );

  v_snapshot_size := octet_length(v_snapshot_data::text);

  INSERT INTO workspace_snapshots (
    user_id, name, snapshot_type, snapshot_data,
    asset_count, container_count, employee_count, task_count,
    pallet_count, credential_count, storage_area_count, snapshot_size
  ) VALUES (
    p_user_id, p_name, p_snapshot_type, v_snapshot_data,
    v_asset_count, v_container_count, v_employee_count, v_task_count,
    v_pallet_count, v_credential_count, v_storage_area_count, v_snapshot_size
  )
  RETURNING id INTO v_snapshot_id;

  -- Keep only the 20 most recent snapshots per user to manage storage
  DELETE FROM workspace_snapshots
  WHERE user_id = p_user_id
    AND id NOT IN (
      SELECT id FROM workspace_snapshots
      WHERE user_id = p_user_id
      ORDER BY created_at DESC
      LIMIT 20
    );

  RETURN v_snapshot_id;
END;
$function$;
