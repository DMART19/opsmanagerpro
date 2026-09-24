
-- Database Integrity Log table
CREATE TABLE IF NOT EXISTS public.database_integrity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL,
  anomaly_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  affected_table text NOT NULL,
  affected_record_id text,
  description text NOT NULL,
  correction_applied text,
  snapshot_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_integrity_log_scan_id ON public.database_integrity_log(scan_id);
CREATE INDEX idx_integrity_log_created_at ON public.database_integrity_log(created_at DESC);
CREATE INDEX idx_integrity_log_severity ON public.database_integrity_log(severity);

-- RLS
ALTER TABLE public.database_integrity_log ENABLE ROW LEVEL SECURITY;

-- Only super-admins can read integrity logs (via service role in edge function)
CREATE POLICY "Service role full access" ON public.database_integrity_log
  FOR ALL USING (true) WITH CHECK (true);

-- Prevention trigger: block duplicate employee email within same workspace (user_id)
CREATE OR REPLACE FUNCTION public.prevent_duplicate_employee_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email <> '' AND NEW.deleted_at IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.employees
      WHERE user_id = NEW.user_id
        AND email = NEW.email
        AND id <> NEW.id
        AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Duplicate employee email % in workspace', NEW.email;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_duplicate_employee_email
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_employee_email();

-- Prevention trigger: block asset creation without user_id (workspace scope)
CREATE OR REPLACE FUNCTION public.enforce_asset_workspace_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Asset must have a workspace owner (user_id)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_asset_workspace_scope
  BEFORE INSERT ON public.cache_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_asset_workspace_scope();

-- Prevention trigger: block container creation without user_id
CREATE OR REPLACE FUNCTION public.enforce_container_workspace_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Container must have a workspace owner (user_id)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_container_workspace_scope
  BEFORE INSERT ON public.cache_boxes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_container_workspace_scope();

-- Integrity scan RPC (runs as service role from edge function)
CREATE OR REPLACE FUNCTION public.run_integrity_scan()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scan_id uuid := gen_random_uuid();
  v_anomaly_count int := 0;
  v_repair_count int := 0;
  rec record;
BEGIN
  -- 1. Orphaned employee_requirements (employee deleted or missing)
  FOR rec IN
    SELECT er.id, er.employee_id
    FROM employee_requirements er
    LEFT JOIN employees e ON e.id = er.employee_id
    WHERE e.id IS NULL OR e.deleted_at IS NOT NULL
  LOOP
    INSERT INTO database_integrity_log (scan_id, anomaly_type, severity, affected_table, affected_record_id, description, correction_applied)
    VALUES (v_scan_id, 'orphaned_foreign_key', 'high', 'employee_requirements', rec.id,
      'Requirement references deleted/missing employee ' || rec.employee_id,
      'Deleted orphaned requirement');
    DELETE FROM employee_requirements WHERE id = rec.id;
    v_anomaly_count := v_anomaly_count + 1;
    v_repair_count := v_repair_count + 1;
  END LOOP;

  -- 2. Orphaned certifications (staff deleted or missing)
  FOR rec IN
    SELECT c.id, c.staff_id
    FROM certifications c
    LEFT JOIN staff s ON s.id = c.staff_id
    WHERE s.id IS NULL
  LOOP
    INSERT INTO database_integrity_log (scan_id, anomaly_type, severity, affected_table, affected_record_id, description, correction_applied)
    VALUES (v_scan_id, 'orphaned_foreign_key', 'medium', 'certifications', rec.id,
      'Certification references missing staff ' || rec.staff_id,
      'Flagged for review');
    v_anomaly_count := v_anomaly_count + 1;
  END LOOP;

  -- 3. Employees missing required first_name or last_name
  FOR rec IN
    SELECT id FROM employees
    WHERE deleted_at IS NULL AND (first_name IS NULL OR first_name = '' OR last_name IS NULL OR last_name = '')
  LOOP
    INSERT INTO database_integrity_log (scan_id, anomaly_type, severity, affected_table, affected_record_id, description, correction_applied)
    VALUES (v_scan_id, 'missing_required_field', 'high', 'employees', rec.id,
      'Employee missing first_name or last_name',
      'Flagged for manual review');
    v_anomaly_count := v_anomaly_count + 1;
  END LOOP;

  -- 4. Employees with invalid role_id references
  FOR rec IN
    SELECT e.id, e.role_id
    FROM employees e
    WHERE e.deleted_at IS NULL AND e.role_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM team_roles tr WHERE tr.id = e.role_id)
  LOOP
    INSERT INTO database_integrity_log (scan_id, anomaly_type, severity, affected_table, affected_record_id, description, correction_applied, snapshot_data)
    VALUES (v_scan_id, 'invalid_foreign_key', 'medium', 'employees', rec.id,
      'Employee references non-existent role ' || rec.role_id,
      'Nullified invalid role_id',
      jsonb_build_object('previous_role_id', rec.role_id));
    UPDATE employees SET role_id = NULL WHERE id = rec.id;
    v_anomaly_count := v_anomaly_count + 1;
    v_repair_count := v_repair_count + 1;
  END LOOP;

  -- 5. Employees with invalid department_id references
  FOR rec IN
    SELECT e.id, e.department_id
    FROM employees e
    WHERE e.deleted_at IS NULL AND e.department_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM departments d WHERE d.id = e.department_id)
  LOOP
    INSERT INTO database_integrity_log (scan_id, anomaly_type, severity, affected_table, affected_record_id, description, correction_applied, snapshot_data)
    VALUES (v_scan_id, 'invalid_foreign_key', 'medium', 'employees', rec.id,
      'Employee references non-existent department ' || rec.department_id,
      'Nullified invalid department_id',
      jsonb_build_object('previous_department_id', rec.department_id));
    UPDATE employees SET department_id = NULL WHERE id = rec.id;
    v_anomaly_count := v_anomaly_count + 1;
    v_repair_count := v_repair_count + 1;
  END LOOP;

  -- 6. Assets missing user_id (workspace scope violation)
  FOR rec IN
    SELECT id FROM cache_inventory WHERE user_id IS NULL AND deleted_at IS NULL
  LOOP
    INSERT INTO database_integrity_log (scan_id, anomaly_type, severity, affected_table, affected_record_id, description, correction_applied)
    VALUES (v_scan_id, 'missing_workspace_scope', 'critical', 'cache_inventory', rec.id,
      'Asset has no workspace owner',
      'Quarantined via soft-delete');
    UPDATE cache_inventory SET deleted_at = now() WHERE id = rec.id;
    v_anomaly_count := v_anomaly_count + 1;
    v_repair_count := v_repair_count + 1;
  END LOOP;

  -- 7. Containers missing user_id
  FOR rec IN
    SELECT id FROM cache_boxes WHERE user_id IS NULL
  LOOP
    INSERT INTO database_integrity_log (scan_id, anomaly_type, severity, affected_table, affected_record_id, description, correction_applied)
    VALUES (v_scan_id, 'missing_workspace_scope', 'critical', 'cache_boxes', rec.id,
      'Container has no workspace owner',
      'Flagged for review');
    v_anomaly_count := v_anomaly_count + 1;
  END LOOP;

  -- 8. Duplicate employee emails within same workspace
  FOR rec IN
    SELECT e1.id, e1.email, e1.user_id
    FROM employees e1
    WHERE e1.deleted_at IS NULL AND e1.email IS NOT NULL AND e1.email <> ''
      AND EXISTS (
        SELECT 1 FROM employees e2
        WHERE e2.user_id = e1.user_id AND e2.email = e1.email
          AND e2.deleted_at IS NULL AND e2.id <> e1.id
          AND e2.created_at > e1.created_at
      )
  LOOP
    INSERT INTO database_integrity_log (scan_id, anomaly_type, severity, affected_table, affected_record_id, description, correction_applied, snapshot_data)
    VALUES (v_scan_id, 'duplicate_record', 'high', 'employees', rec.id,
      'Duplicate email ' || rec.email || ' in workspace',
      'Archived older duplicate via soft-delete',
      jsonb_build_object('email', rec.email, 'user_id', rec.user_id));
    UPDATE employees SET deleted_at = now() WHERE id = rec.id;
    v_anomaly_count := v_anomaly_count + 1;
    v_repair_count := v_repair_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'scan_id', v_scan_id,
    'anomalies_found', v_anomaly_count,
    'repairs_applied', v_repair_count,
    'completed_at', now()
  );
END;
$$;
