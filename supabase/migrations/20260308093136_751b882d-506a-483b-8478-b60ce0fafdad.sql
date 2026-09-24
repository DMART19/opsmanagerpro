
-- ============================================================
-- DISASTER RECOVERY MONITORING
-- ============================================================

-- Track backup status and recovery readiness
CREATE TABLE public.backup_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL DEFAULT 'automated',
  status TEXT NOT NULL DEFAULT 'completed',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  backup_size_bytes BIGINT,
  table_count INTEGER,
  row_count BIGINT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.backup_records ENABLE ROW LEVEL SECURITY;

-- Only super admins can read backup records
CREATE POLICY "super_admin_read_backups" ON backup_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- Only service role / triggers can insert
CREATE POLICY "service_insert_backups" ON backup_records
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- Recovery readiness checks
CREATE TABLE public.recovery_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pass',
  details JSONB DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recovery_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_read_recovery_checks" ON recovery_checks
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "super_admin_insert_recovery_checks" ON recovery_checks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- Function to run recovery readiness assessment
CREATE OR REPLACE FUNCTION public.run_recovery_assessment()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb := '[]'::jsonb;
  _check jsonb;
  _count bigint;
  _last_backup timestamptz;
  _snapshot_count int;
  _tables_with_rls int;
  _total_tables int;
BEGIN
  -- Check 1: Last backup record
  SELECT MAX(completed_at) INTO _last_backup FROM backup_records WHERE status = 'completed';
  
  INSERT INTO recovery_checks (check_type, status, details) VALUES (
    'last_backup',
    CASE 
      WHEN _last_backup IS NULL THEN 'warn'
      WHEN _last_backup < now() - interval '24 hours' THEN 'warn'
      ELSE 'pass'
    END,
    jsonb_build_object('last_backup', _last_backup, 'age_hours', 
      EXTRACT(EPOCH FROM (now() - COALESCE(_last_backup, now() - interval '999 hours'))) / 3600)
  );

  -- Check 2: Workspace snapshots exist
  SELECT COUNT(*) INTO _snapshot_count FROM workspace_snapshots;
  
  INSERT INTO recovery_checks (check_type, status, details) VALUES (
    'workspace_snapshots',
    CASE WHEN _snapshot_count > 0 THEN 'pass' ELSE 'warn' END,
    jsonb_build_object('total_snapshots', _snapshot_count)
  );

  -- Check 3: RLS coverage
  SELECT COUNT(*) INTO _total_tables
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  SELECT COUNT(*) INTO _tables_with_rls
  FROM pg_tables 
  WHERE schemaname = 'public' AND rowsecurity = true;

  INSERT INTO recovery_checks (check_type, status, details) VALUES (
    'rls_coverage',
    CASE WHEN _tables_with_rls >= _total_tables * 0.8 THEN 'pass' ELSE 'warn' END,
    jsonb_build_object('tables_with_rls', _tables_with_rls, 'total_tables', _total_tables,
      'coverage_pct', ROUND((_tables_with_rls::numeric / GREATEST(_total_tables, 1)) * 100, 1))
  );

  -- Check 4: Audit log integrity (immutability triggers exist)
  INSERT INTO recovery_checks (check_type, status, details) VALUES (
    'audit_immutability',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_audit_update'
    ) THEN 'pass' ELSE 'fail' END,
    jsonb_build_object('audit_triggers_active', EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_audit_update'
    ))
  );

  -- Check 5: Data volume summary
  SELECT COUNT(*) INTO _count FROM cache_inventory WHERE deleted_at IS NULL;
  
  INSERT INTO recovery_checks (check_type, status, details) VALUES (
    'data_volume',
    'info',
    jsonb_build_object(
      'total_assets', _count,
      'total_employees', (SELECT COUNT(*) FROM employees WHERE deleted_at IS NULL),
      'total_workspaces', (SELECT COUNT(DISTINCT user_id) FROM workspace_settings)
    )
  );

  -- Return latest checks
  SELECT jsonb_agg(to_jsonb(rc)) INTO _result
  FROM (
    SELECT check_type, status, details, checked_at
    FROM recovery_checks
    ORDER BY checked_at DESC
    LIMIT 20
  ) rc;

  RETURN COALESCE(_result, '[]'::jsonb);
END;
$$;

-- Indexes
CREATE INDEX idx_backup_records_status ON backup_records(status, completed_at DESC);
CREATE INDEX idx_recovery_checks_type ON recovery_checks(check_type, checked_at DESC);
