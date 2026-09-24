
-- ============================================================
-- COMPREHENSIVE CHANGE TRACKING
-- ============================================================

-- 1. Change history table
CREATE TABLE public.change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  workspace_id UUID,
  object_type TEXT NOT NULL,
  object_id UUID NOT NULL,
  action TEXT NOT NULL,  -- 'insert', 'update', 'delete'
  field_changed TEXT,
  previous_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;

-- Super admin read-only
CREATE POLICY "super_admin_read_change_history" ON change_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- Authenticated insert (from triggers / app)
CREATE POLICY "authenticated_insert_change_history" ON change_history
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 2. Immutability
CREATE TRIGGER trg_prevent_change_history_update
  BEFORE UPDATE ON change_history
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trg_prevent_change_history_delete
  BEFORE DELETE ON change_history
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- 3. Indexes
CREATE INDEX idx_change_history_object ON change_history(object_type, object_id);
CREATE INDEX idx_change_history_user ON change_history(user_id, created_at DESC);
CREATE INDEX idx_change_history_workspace ON change_history(workspace_id, created_at DESC);
CREATE INDEX idx_change_history_created ON change_history(created_at DESC);
CREATE INDEX idx_change_history_action ON change_history(action);

-- 4. Generic trigger function for field-level change capture
CREATE OR REPLACE FUNCTION public.track_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _object_type TEXT;
  _user_id UUID;
  _workspace_id UUID;
  _col TEXT;
  _old_val TEXT;
  _new_val TEXT;
  _skip_cols TEXT[] := ARRAY['updated_at', 'created_at'];
  _cols TEXT[];
  _old_row JSONB;
  _new_row JSONB;
BEGIN
  _object_type := TG_ARGV[0];

  -- Resolve user_id
  _user_id := COALESCE(auth.uid(), NULL);

  -- Resolve workspace_id from row data
  IF TG_OP = 'DELETE' THEN
    _old_row := to_jsonb(OLD);
    _workspace_id := COALESCE((_old_row->>'user_id')::uuid, NULL);
  ELSE
    _new_row := to_jsonb(NEW);
    _old_row := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
    _workspace_id := COALESCE((_new_row->>'user_id')::uuid, NULL);
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO change_history (user_id, workspace_id, object_type, object_id, action, field_changed, new_value)
    VALUES (_user_id, _workspace_id, _object_type, (NEW.id)::uuid, 'insert', NULL,
      LEFT(_new_row::text, 500));
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO change_history (user_id, workspace_id, object_type, object_id, action, field_changed, previous_value)
    VALUES (_user_id, _workspace_id, _object_type, (OLD.id)::uuid, 'delete', NULL,
      LEFT(_old_row::text, 500));
    RETURN OLD;
  END IF;

  -- UPDATE: track each changed field
  SELECT array_agg(column_name::text) INTO _cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = TG_TABLE_NAME;

  FOREACH _col IN ARRAY _cols LOOP
    IF _col = ANY(_skip_cols) THEN CONTINUE; END IF;

    _old_val := _old_row->>_col;
    _new_val := _new_row->>_col;

    IF _old_val IS DISTINCT FROM _new_val THEN
      INSERT INTO change_history (user_id, workspace_id, object_type, object_id, action, field_changed, previous_value, new_value)
      VALUES (_user_id, _workspace_id, _object_type, (NEW.id)::uuid, 'update', _col,
        LEFT(COALESCE(_old_val, ''), 500),
        LEFT(COALESCE(_new_val, ''), 500));
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 5. Attach triggers to core tables

-- Workspace settings
DROP TRIGGER IF EXISTS trg_track_workspace_settings ON workspace_settings;
CREATE TRIGGER trg_track_workspace_settings
  AFTER INSERT OR UPDATE OR DELETE ON workspace_settings
  FOR EACH ROW EXECUTE FUNCTION track_field_changes('workspace_settings');

-- Workspace members (role/permission changes)
DROP TRIGGER IF EXISTS trg_track_workspace_members ON workspace_members;
CREATE TRIGGER trg_track_workspace_members
  AFTER INSERT OR UPDATE OR DELETE ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION track_field_changes('workspace_member');

-- Employees (team member changes)
DROP TRIGGER IF EXISTS trg_track_employees ON employees;
CREATE TRIGGER trg_track_employees
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION track_field_changes('employee');

-- Cache inventory (asset + container edits)
DROP TRIGGER IF EXISTS trg_track_cache_inventory ON cache_inventory;
CREATE TRIGGER trg_track_cache_inventory
  AFTER INSERT OR UPDATE OR DELETE ON cache_inventory
  FOR EACH ROW EXECUTE FUNCTION track_field_changes('asset');

-- Employee requirements (credential updates)
DROP TRIGGER IF EXISTS trg_track_employee_requirements ON employee_requirements;
CREATE TRIGGER trg_track_employee_requirements
  AFTER INSERT OR UPDATE OR DELETE ON employee_requirements
  FOR EACH ROW EXECUTE FUNCTION track_field_changes('credential');

-- Pallets (pallet layout changes)
DROP TRIGGER IF EXISTS trg_track_pallets ON pallets;
CREATE TRIGGER trg_track_pallets
  AFTER INSERT OR UPDATE OR DELETE ON pallets
  FOR EACH ROW EXECUTE FUNCTION track_field_changes('pallet');

-- Cases (pallet case changes)
DROP TRIGGER IF EXISTS trg_track_cases ON cases;
CREATE TRIGGER trg_track_cases
  AFTER INSERT OR UPDATE OR DELETE ON cases
  FOR EACH ROW EXECUTE FUNCTION track_field_changes('case');

-- Requirement definitions
DROP TRIGGER IF EXISTS trg_track_requirement_definitions ON requirement_definitions;
CREATE TRIGGER trg_track_requirement_definitions
  AFTER INSERT OR UPDATE OR DELETE ON requirement_definitions
  FOR EACH ROW EXECUTE FUNCTION track_field_changes('requirement_definition');

-- Departments
DROP TRIGGER IF EXISTS trg_track_departments ON departments;
CREATE TRIGGER trg_track_departments
  AFTER INSERT OR UPDATE OR DELETE ON departments
  FOR EACH ROW EXECUTE FUNCTION track_field_changes('department');

-- Team roles
DROP TRIGGER IF EXISTS trg_track_team_roles ON team_roles;
CREATE TRIGGER trg_track_team_roles
  AFTER INSERT OR UPDATE OR DELETE ON team_roles
  FOR EACH ROW EXECUTE FUNCTION track_field_changes('team_role');
