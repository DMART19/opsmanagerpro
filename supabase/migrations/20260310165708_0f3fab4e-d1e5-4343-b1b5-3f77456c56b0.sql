
-- Drop and recreate restore function with all 7 categories
DROP FUNCTION IF EXISTS public.restore_workspace_snapshot(uuid, uuid, text, text[]);

CREATE FUNCTION public.restore_workspace_snapshot(
  p_user_id uuid,
  p_snapshot_id uuid,
  p_restore_mode text DEFAULT 'full',
  p_categories text[] DEFAULT ARRAY['assets','containers','employees','tasks','pallets','credentials','storage_areas']
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
  v_restored_pallets int := 0; v_restored_credentials int := 0;
  v_restored_storage_areas int := 0;
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

  -- Restore pallets
  IF p_restore_mode = 'full' OR 'pallets' = ANY(p_categories) THEN
    UPDATE pallets SET deleted_at = now(), deleted_by = p_user_id
    WHERE created_by = p_user_id AND deleted_at IS NULL;
    FOR v_record IN SELECT * FROM jsonb_array_elements(v_snapshot_data->'pallets') LOOP
      INSERT INTO pallets (id, created_by, pallet_id, pallet_type, status,
        current_weight, max_capacity, section_id, created_at, updated_at, deleted_at)
      VALUES ((v_record->>'id')::uuid, p_user_id, v_record->>'pallet_id', v_record->>'pallet_type',
        COALESCE(v_record->>'status','active'), COALESCE((v_record->>'current_weight')::numeric,0),
        COALESCE((v_record->>'max_capacity')::numeric,0),
        NULLIF(v_record->>'section_id','')::uuid,
        now(), now(), NULL)
      ON CONFLICT (id) DO UPDATE SET pallet_id=EXCLUDED.pallet_id, pallet_type=EXCLUDED.pallet_type,
        status=EXCLUDED.status, current_weight=EXCLUDED.current_weight, max_capacity=EXCLUDED.max_capacity,
        section_id=EXCLUDED.section_id, deleted_at=NULL, deleted_by=NULL, updated_at=now();
      v_restored_pallets := v_restored_pallets + 1;
    END LOOP;
  END IF;

  -- Restore credentials
  IF p_restore_mode = 'full' OR 'credentials' = ANY(p_categories) THEN
    UPDATE certifications SET deleted_at = now(), deleted_by = p_user_id
    WHERE created_by = p_user_id AND deleted_at IS NULL;
    FOR v_record IN SELECT * FROM jsonb_array_elements(v_snapshot_data->'credentials') LOOP
      INSERT INTO certifications (id, created_by, name, certification_type, certification_number,
        staff_id, issue_date, expiry_date, issuing_organization, status, created_at, updated_at, deleted_at)
      VALUES ((v_record->>'id')::uuid, p_user_id, v_record->>'name', v_record->>'certification_type',
        v_record->>'certification_number', (v_record->>'staff_id')::uuid,
        (v_record->>'issue_date')::date, NULLIF(v_record->>'expiry_date','')::date,
        v_record->>'issuing_organization', COALESCE(v_record->>'status','active'),
        now(), now(), NULL)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, certification_type=EXCLUDED.certification_type,
        certification_number=EXCLUDED.certification_number, staff_id=EXCLUDED.staff_id,
        issue_date=EXCLUDED.issue_date, expiry_date=EXCLUDED.expiry_date,
        issuing_organization=EXCLUDED.issuing_organization, status=EXCLUDED.status,
        deleted_at=NULL, deleted_by=NULL, updated_at=now();
      v_restored_credentials := v_restored_credentials + 1;
    END LOOP;
  END IF;

  -- Restore storage areas
  IF p_restore_mode = 'full' OR 'storage_areas' = ANY(p_categories) THEN
    -- Storage areas use soft approach: upsert only, don't delete existing
    FOR v_record IN SELECT * FROM jsonb_array_elements(v_snapshot_data->'storage_areas') LOOP
      INSERT INTO warehouse_sections (id, created_by, warehouse_id, section_name, created_at, updated_at)
      VALUES ((v_record->>'id')::uuid, p_user_id,
        (v_record->>'warehouse_id')::uuid, COALESCE(v_record->>'name', v_record->>'section_name', 'Restored Section'),
        now(), now())
      ON CONFLICT (id) DO UPDATE SET section_name=EXCLUDED.section_name, updated_at=now();
      v_restored_storage_areas := v_restored_storage_areas + 1;
    END LOOP;
  END IF;

  v_action_type := CASE WHEN p_restore_mode = 'full' THEN 'workspace_restored' ELSE 'partial_restore' END;

  v_result := jsonb_build_object('success', true, 'pre_restore_snapshot_id', v_pre_snapshot_id,
    'restore_mode', p_restore_mode, 'restored', jsonb_build_object(
      'assets', v_restored_assets, 'containers', v_restored_containers,
      'employees', v_restored_employees, 'tasks', v_restored_tasks,
      'pallets', v_restored_pallets, 'credentials', v_restored_credentials,
      'storage_areas', v_restored_storage_areas));

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
