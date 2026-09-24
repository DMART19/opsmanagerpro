
-- Drop existing functions to allow signature changes
DROP FUNCTION IF EXISTS public.create_workspace_snapshot(uuid, text, text);
DROP FUNCTION IF EXISTS public.restore_workspace_snapshot(uuid, uuid, text, text[]);

-- Recreate create_workspace_snapshot with audit logging
CREATE FUNCTION public.create_workspace_snapshot(
  p_user_id uuid,
  p_name text,
  p_snapshot_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_assets jsonb; v_containers jsonb; v_employees jsonb; v_tasks jsonb;
  v_pallets jsonb; v_credentials jsonb; v_storage_areas jsonb;
  v_snapshot_data jsonb; v_snapshot_size int; v_snapshot_id uuid;
  v_asset_count int; v_container_count int; v_employee_count int;
  v_task_count int; v_pallet_count int; v_credential_count int; v_storage_area_count int;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(r) - 'custom_data' - 'image_url'), '[]'::jsonb) INTO v_assets
  FROM (SELECT id, description, asset_type, box_number, box_number_alt, barcode,
    quantity_available, quantity_out, section, container_id, category_id,
    manufacturer_id, asset_status_id, asset_group_id, date_expire,
    serial_number, model_part_num, id_cache_fema, id_cache_tf,
    low_stock_threshold, critical_stock_threshold
    FROM cache_inventory WHERE user_id = p_user_id AND deleted_at IS NULL AND asset_type = 'item') r;
  v_asset_count := jsonb_array_length(v_assets);

  SELECT COALESCE(jsonb_agg(to_jsonb(r) - 'custom_data' - 'image_url'), '[]'::jsonb) INTO v_containers
  FROM (SELECT id, description, asset_type, box_number, box_number_alt, barcode,
    quantity_available, quantity_out, section, container_id, category_id,
    container_type_id, container_status_id, container_group_id
    FROM cache_inventory WHERE user_id = p_user_id AND deleted_at IS NULL AND asset_type = 'container') r;
  v_container_count := jsonb_array_length(v_containers);

  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) INTO v_employees
  FROM (SELECT id, first_name, last_name, email, phone, position, employee_id,
    department_id, role_id, employee_status_id, hire_date, base_location, tags
    FROM employees WHERE user_id = p_user_id AND deleted_at IS NULL) r;
  v_employee_count := jsonb_array_length(v_employees);

  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) INTO v_tasks
  FROM (SELECT id, title, description, task_type, status, priority, start_date,
    end_date, completed_at, assigned_to
    FROM tasks WHERE user_id = p_user_id AND deleted_at IS NULL) r;
  v_task_count := jsonb_array_length(v_tasks);

  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) INTO v_pallets
  FROM (SELECT id, pallet_id, pallet_type, status, current_weight, max_capacity, section_id
    FROM pallets WHERE created_by = p_user_id AND deleted_at IS NULL) r;
  v_pallet_count := jsonb_array_length(v_pallets);

  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) INTO v_credentials
  FROM (SELECT id, name, certification_type, certification_number, staff_id,
    issue_date, expiry_date, issuing_organization, status
    FROM certifications WHERE created_by = p_user_id AND deleted_at IS NULL) r;
  v_credential_count := jsonb_array_length(v_credentials);

  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) INTO v_storage_areas
  FROM (SELECT ws.id, ws.name, ws.warehouse_id, w.name as warehouse_name
    FROM warehouse_sections ws JOIN warehouses w ON w.id = ws.warehouse_id
    WHERE ws.created_by = p_user_id) r;
  v_storage_area_count := jsonb_array_length(v_storage_areas);

  v_snapshot_data := jsonb_build_object(
    'assets', v_assets, 'containers', v_containers, 'employees', v_employees,
    'tasks', v_tasks, 'pallets', v_pallets, 'credentials', v_credentials,
    'storage_areas', v_storage_areas, 'captured_at', now()
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
  ) RETURNING id INTO v_snapshot_id;

  DELETE FROM workspace_snapshots WHERE user_id = p_user_id
    AND id NOT IN (SELECT id FROM workspace_snapshots WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 20);

  -- Audit log
  INSERT INTO snapshot_audit_logs (
    workspace_id, user_id, action_type, snapshot_id, snapshot_name,
    snapshot_timestamp, performed_by, performed_by_role, details
  ) VALUES (
    p_user_id, p_user_id, 'snapshot_created', v_snapshot_id, p_name, now(),
    COALESCE(auth.uid(), p_user_id),
    CASE WHEN auth.uid() IS DISTINCT FROM p_user_id THEN 'super_admin' ELSE 'workspace_admin' END,
    jsonb_build_object('snapshot_type', p_snapshot_type,
      'asset_count', v_asset_count, 'container_count', v_container_count,
      'employee_count', v_employee_count, 'task_count', v_task_count)
  );

  RETURN v_snapshot_id;
END;
$$;

-- Recreate restore_workspace_snapshot with audit logging
CREATE FUNCTION public.restore_workspace_snapshot(
  p_user_id uuid,
  p_snapshot_id uuid,
  p_restore_mode text DEFAULT 'full',
  p_categories text[] DEFAULT ARRAY['assets','containers','employees','tasks']
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_snapshot_data jsonb; v_snapshot_name text; v_snapshot_ts timestamptz;
  v_pre_snapshot_id uuid; v_result jsonb; v_record jsonb;
  v_restored_assets int := 0; v_restored_containers int := 0;
  v_restored_employees int := 0; v_restored_tasks int := 0;
  v_action_type text;
BEGIN
  SELECT snapshot_data, name, created_at INTO v_snapshot_data, v_snapshot_name, v_snapshot_ts
  FROM workspace_snapshots WHERE id = p_snapshot_id AND user_id = p_user_id;

  IF v_snapshot_data IS NULL THEN
    RAISE EXCEPTION 'Snapshot not found or access denied';
  END IF;

  SELECT create_workspace_snapshot(p_user_id, 'Before restore: ' || p_snapshot_id::text, 'pre_action')
  INTO v_pre_snapshot_id;

  -- Restore containers
  IF p_restore_mode = 'full' OR 'containers' = ANY(p_categories) THEN
    UPDATE cache_inventory SET deleted_at = now(), deleted_by = p_user_id
    WHERE user_id = p_user_id AND deleted_at IS NULL AND asset_type = 'container';
    FOR v_record IN SELECT * FROM jsonb_array_elements(v_snapshot_data->'containers') LOOP
      INSERT INTO cache_inventory (id, user_id, description, asset_type, box_number, box_number_alt, barcode,
        quantity_available, quantity_out, section, container_id, category_id,
        container_type_id, container_status_id, container_group_id, created_at, updated_at, deleted_at)
      VALUES ((v_record->>'id')::uuid, p_user_id, v_record->>'description', 'container',
        v_record->>'box_number', v_record->>'box_number_alt', v_record->>'barcode',
        COALESCE((v_record->>'quantity_available')::int,0), COALESCE((v_record->>'quantity_out')::int,0),
        v_record->>'section', NULLIF(v_record->>'container_id','')::uuid,
        NULLIF(v_record->>'category_id','')::uuid, NULLIF(v_record->>'container_type_id','')::uuid,
        NULLIF(v_record->>'container_status_id','')::uuid, NULLIF(v_record->>'container_group_id','')::uuid,
        now(), now(), NULL)
      ON CONFLICT (id) DO UPDATE SET description=EXCLUDED.description, box_number=EXCLUDED.box_number,
        box_number_alt=EXCLUDED.box_number_alt, barcode=EXCLUDED.barcode,
        quantity_available=EXCLUDED.quantity_available, quantity_out=EXCLUDED.quantity_out,
        section=EXCLUDED.section, container_id=EXCLUDED.container_id, category_id=EXCLUDED.category_id,
        container_type_id=EXCLUDED.container_type_id, container_status_id=EXCLUDED.container_status_id,
        container_group_id=EXCLUDED.container_group_id, deleted_at=NULL, deleted_by=NULL, updated_at=now();
      v_restored_containers := v_restored_containers + 1;
    END LOOP;
  END IF;

  -- Restore assets
  IF p_restore_mode = 'full' OR 'assets' = ANY(p_categories) THEN
    UPDATE cache_inventory SET deleted_at = now(), deleted_by = p_user_id
    WHERE user_id = p_user_id AND deleted_at IS NULL AND asset_type = 'item';
    FOR v_record IN SELECT * FROM jsonb_array_elements(v_snapshot_data->'assets') LOOP
      INSERT INTO cache_inventory (id, user_id, description, asset_type, box_number, box_number_alt, barcode,
        quantity_available, quantity_out, section, container_id, category_id,
        manufacturer_id, asset_status_id, asset_group_id, date_expire,
        serial_number, model_part_num, id_cache_fema, id_cache_tf,
        low_stock_threshold, critical_stock_threshold, created_at, updated_at, deleted_at)
      VALUES ((v_record->>'id')::uuid, p_user_id, v_record->>'description', 'item',
        v_record->>'box_number', v_record->>'box_number_alt', v_record->>'barcode',
        COALESCE((v_record->>'quantity_available')::int,0), COALESCE((v_record->>'quantity_out')::int,0),
        v_record->>'section', NULLIF(v_record->>'container_id','')::uuid,
        NULLIF(v_record->>'category_id','')::uuid, NULLIF(v_record->>'manufacturer_id','')::uuid,
        NULLIF(v_record->>'asset_status_id','')::uuid, NULLIF(v_record->>'asset_group_id','')::uuid,
        NULLIF(v_record->>'date_expire','')::date, v_record->>'serial_number',
        v_record->>'model_part_num', v_record->>'id_cache_fema', v_record->>'id_cache_tf',
        NULLIF(v_record->>'low_stock_threshold','')::int, NULLIF(v_record->>'critical_stock_threshold','')::int,
        now(), now(), NULL)
      ON CONFLICT (id) DO UPDATE SET description=EXCLUDED.description, box_number=EXCLUDED.box_number,
        box_number_alt=EXCLUDED.box_number_alt, barcode=EXCLUDED.barcode,
        quantity_available=EXCLUDED.quantity_available, quantity_out=EXCLUDED.quantity_out,
        section=EXCLUDED.section, container_id=EXCLUDED.container_id, category_id=EXCLUDED.category_id,
        manufacturer_id=EXCLUDED.manufacturer_id, asset_status_id=EXCLUDED.asset_status_id,
        asset_group_id=EXCLUDED.asset_group_id, date_expire=EXCLUDED.date_expire,
        serial_number=EXCLUDED.serial_number, model_part_num=EXCLUDED.model_part_num,
        id_cache_fema=EXCLUDED.id_cache_fema, id_cache_tf=EXCLUDED.id_cache_tf,
        low_stock_threshold=EXCLUDED.low_stock_threshold, critical_stock_threshold=EXCLUDED.critical_stock_threshold,
        deleted_at=NULL, deleted_by=NULL, updated_at=now();
      v_restored_assets := v_restored_assets + 1;
    END LOOP;
  END IF;

  -- Restore employees
  IF p_restore_mode = 'full' OR 'employees' = ANY(p_categories) THEN
    UPDATE employees SET deleted_at = now(), deleted_by = p_user_id
    WHERE user_id = p_user_id AND deleted_at IS NULL;
    FOR v_record IN SELECT * FROM jsonb_array_elements(v_snapshot_data->'employees') LOOP
      INSERT INTO employees (id, user_id, first_name, last_name, email, phone, position, employee_id,
        department_id, role_id, employee_status_id, hire_date, base_location, tags, created_at, updated_at, deleted_at)
      VALUES ((v_record->>'id')::uuid, p_user_id, v_record->>'first_name', v_record->>'last_name',
        v_record->>'email', v_record->>'phone', v_record->>'position', v_record->>'employee_id',
        NULLIF(v_record->>'department_id','')::uuid, NULLIF(v_record->>'role_id','')::uuid,
        NULLIF(v_record->>'employee_status_id','')::uuid, NULLIF(v_record->>'hire_date','')::date,
        v_record->>'base_location',
        CASE WHEN v_record->'tags' IS NOT NULL AND v_record->'tags' != 'null'::jsonb
          THEN ARRAY(SELECT jsonb_array_elements_text(v_record->'tags')) ELSE NULL END,
        now(), now(), NULL)
      ON CONFLICT (id) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name,
        email=EXCLUDED.email, phone=EXCLUDED.phone, position=EXCLUDED.position, employee_id=EXCLUDED.employee_id,
        department_id=EXCLUDED.department_id, role_id=EXCLUDED.role_id, employee_status_id=EXCLUDED.employee_status_id,
        hire_date=EXCLUDED.hire_date, base_location=EXCLUDED.base_location, tags=EXCLUDED.tags,
        deleted_at=NULL, deleted_by=NULL, updated_at=now();
      v_restored_employees := v_restored_employees + 1;
    END LOOP;
  END IF;

  -- Restore tasks
  IF p_restore_mode = 'full' OR 'tasks' = ANY(p_categories) THEN
    UPDATE tasks SET deleted_at = now(), deleted_by = p_user_id
    WHERE user_id = p_user_id AND deleted_at IS NULL;
    FOR v_record IN SELECT * FROM jsonb_array_elements(v_snapshot_data->'tasks') LOOP
      INSERT INTO tasks (id, user_id, title, description, task_type, status, priority,
        start_date, end_date, completed_at, assigned_to, created_at, updated_at, deleted_at)
      VALUES ((v_record->>'id')::uuid, p_user_id, v_record->>'title', v_record->>'description',
        v_record->>'task_type', COALESCE(v_record->>'status','pending'), v_record->>'priority',
        NULLIF(v_record->>'start_date','')::timestamptz, NULLIF(v_record->>'end_date','')::timestamptz,
        NULLIF(v_record->>'completed_at','')::timestamptz, NULLIF(v_record->>'assigned_to','')::uuid,
        now(), now(), NULL)
      ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description,
        task_type=EXCLUDED.task_type, status=EXCLUDED.status, priority=EXCLUDED.priority,
        start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date, completed_at=EXCLUDED.completed_at,
        assigned_to=EXCLUDED.assigned_to, deleted_at=NULL, deleted_by=NULL, updated_at=now();
      v_restored_tasks := v_restored_tasks + 1;
    END LOOP;
  END IF;

  v_action_type := CASE WHEN p_restore_mode = 'full' THEN 'workspace_restored' ELSE 'partial_restore' END;

  v_result := jsonb_build_object('success', true, 'pre_restore_snapshot_id', v_pre_snapshot_id,
    'restore_mode', p_restore_mode, 'restored', jsonb_build_object(
      'assets', v_restored_assets, 'containers', v_restored_containers,
      'employees', v_restored_employees, 'tasks', v_restored_tasks));

  -- Audit log
  INSERT INTO snapshot_audit_logs (
    workspace_id, user_id, action_type, snapshot_id, snapshot_name,
    snapshot_timestamp, restore_timestamp, restore_mode, restored_categories,
    restored_counts, performed_by, performed_by_role, details
  ) VALUES (
    p_user_id, p_user_id, v_action_type, p_snapshot_id, v_snapshot_name,
    v_snapshot_ts, now(), p_restore_mode, p_categories, v_result->'restored',
    COALESCE(auth.uid(), p_user_id),
    CASE WHEN auth.uid() IS DISTINCT FROM p_user_id THEN 'super_admin' ELSE 'workspace_admin' END,
    jsonb_build_object('pre_restore_snapshot_id', v_pre_snapshot_id)
  );

  RETURN v_result;
END;
$$;
