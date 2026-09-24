
-- ============================================================
-- AUDIT LOG IMMUTABILITY & ENHANCEMENTS
-- ============================================================

-- 1. Add workspace_id column
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- 2. IMMUTABILITY function
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted. Record ID: %', OLD.id;
  RETURN NULL;
END;
$$;

-- 3. Immutability triggers on audit_logs
DROP TRIGGER IF EXISTS trg_prevent_audit_update ON audit_logs;
DROP TRIGGER IF EXISTS trg_prevent_audit_delete ON audit_logs;

CREATE TRIGGER trg_prevent_audit_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trg_prevent_audit_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- 4. Immutability on permission_audit_logs
DROP TRIGGER IF EXISTS trg_prevent_perm_audit_update ON permission_audit_logs;
DROP TRIGGER IF EXISTS trg_prevent_perm_audit_delete ON permission_audit_logs;

CREATE TRIGGER trg_prevent_perm_audit_update
  BEFORE UPDATE ON permission_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trg_prevent_perm_audit_delete
  BEFORE DELETE ON permission_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- 5. Immutability on security_events
DROP TRIGGER IF EXISTS trg_prevent_security_event_update ON security_events;
DROP TRIGGER IF EXISTS trg_prevent_security_event_delete ON security_events;

CREATE TRIGGER trg_prevent_security_event_update
  BEFORE UPDATE ON security_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trg_prevent_security_event_delete
  BEFORE DELETE ON security_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- 6. RLS: Replace policies with read-only + insert-only
DROP POLICY IF EXISTS "Users can insert own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs viewable by admins only" ON audit_logs;

CREATE POLICY "super_admin_read_audit_logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    OR changed_by = auth.uid()
  );

CREATE POLICY "authenticated_insert_audit_logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace ON audit_logs (workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
