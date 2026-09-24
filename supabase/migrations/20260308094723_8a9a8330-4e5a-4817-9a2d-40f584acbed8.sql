
-- ============================================================
-- DATA LIFECYCLE GOVERNANCE SYSTEM
-- ============================================================

-- 1. Data governance policies — configurable retention rules per data type
CREATE TABLE public.data_governance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT NOT NULL UNIQUE, -- e.g. 'error_logs', 'audit_logs', 'change_history', 'product_events', 'demo_sessions', 'backup_records'
  display_name TEXT NOT NULL,
  retention_days INTEGER NOT NULL DEFAULT 365,
  classification TEXT NOT NULL DEFAULT 'internal', -- 'public', 'internal', 'confidential', 'restricted'
  contains_pii BOOLEAN NOT NULL DEFAULT false,
  auto_purge_enabled BOOLEAN NOT NULL DEFAULT false,
  purge_strategy TEXT NOT NULL DEFAULT 'soft_delete', -- 'soft_delete', 'hard_delete', 'archive'
  last_purge_at TIMESTAMPTZ,
  last_purge_count INTEGER DEFAULT 0,
  description TEXT,
  owner_team TEXT DEFAULT 'platform',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.data_governance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_manage_governance" ON data_governance_policies
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE TRIGGER trg_governance_updated_at
  BEFORE UPDATE ON data_governance_policies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Data classifications — field-level sensitivity tagging
CREATE TABLE public.data_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  classification TEXT NOT NULL DEFAULT 'internal', -- 'public', 'internal', 'confidential', 'restricted'
  contains_pii BOOLEAN NOT NULL DEFAULT false,
  pii_type TEXT, -- 'email', 'phone', 'name', 'address', 'ssn', 'financial', null
  masking_required BOOLEAN NOT NULL DEFAULT false,
  encryption_required BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  classified_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(table_name, column_name)
);

ALTER TABLE public.data_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_manage_classifications" ON data_classifications
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE TRIGGER trg_classifications_updated_at
  BEFORE UPDATE ON data_classifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Data lineage records — tracks data origin and transformations
CREATE TABLE public.data_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL,
  source_id TEXT,
  target_table TEXT NOT NULL,
  target_id TEXT,
  transformation_type TEXT NOT NULL DEFAULT 'direct', -- 'direct', 'aggregation', 'derivation', 'migration', 'import', 'export'
  description TEXT,
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.data_lineage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_read_lineage" ON data_lineage
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "system_insert_lineage" ON data_lineage
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Immutable lineage
CREATE TRIGGER trg_prevent_lineage_update
  BEFORE UPDATE ON data_lineage
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trg_prevent_lineage_delete
  BEFORE DELETE ON data_lineage
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

CREATE INDEX idx_lineage_source ON data_lineage(source_table, source_id);
CREATE INDEX idx_lineage_target ON data_lineage(target_table, target_id);
CREATE INDEX idx_lineage_performed ON data_lineage(performed_at DESC);

-- 4. Seed default governance policies
INSERT INTO data_governance_policies (data_type, display_name, retention_days, classification, contains_pii, auto_purge_enabled, purge_strategy, description) VALUES
  ('error_logs', 'Error Logs', 90, 'internal', true, true, 'hard_delete', 'Application error telemetry with user context'),
  ('audit_logs', 'Audit Logs', 730, 'confidential', true, false, 'archive', 'Immutable record of all data modifications'),
  ('change_history', 'Change History', 365, 'confidential', false, false, 'archive', 'Field-level change tracking for configuration and data'),
  ('product_events', 'Product Events', 180, 'internal', false, true, 'hard_delete', 'Feature usage analytics events'),
  ('demo_sessions', 'Demo Sessions', 30, 'internal', true, true, 'hard_delete', 'Temporary demo environment sessions'),
  ('backup_records', 'Backup Records', 365, 'confidential', false, false, 'archive', 'Database backup metadata'),
  ('friction_events', 'Friction Events', 90, 'internal', true, true, 'hard_delete', 'UX friction point tracking'),
  ('demo_feedback', 'Demo Feedback', 180, 'internal', true, true, 'soft_delete', 'User feedback from demo sessions'),
  ('admin_alerts', 'Admin Alerts', 90, 'internal', false, true, 'hard_delete', 'System alert notifications'),
  ('secrets_audit_log', 'Secrets Audit Log', 365, 'restricted', false, false, 'archive', 'Secrets integrity assessment records'),
  ('incidents', 'Incidents', 730, 'confidential', false, false, 'archive', 'Operational incident records'),
  ('incident_timeline', 'Incident Timeline', 730, 'confidential', false, false, 'archive', 'Immutable incident response timeline'),
  ('workspace_snapshots', 'Workspace Snapshots', 365, 'restricted', true, true, 'hard_delete', 'Point-in-time workspace data snapshots'),
  ('certifications', 'Certifications', 0, 'confidential', true, false, 'soft_delete', 'Staff certification records (no auto-purge)'),
  ('employees', 'Team Members', 0, 'confidential', true, false, 'soft_delete', 'Employee/team member records (no auto-purge)'),
  ('cache_inventory', 'Assets & Containers', 0, 'internal', false, false, 'soft_delete', 'Inventory items (no auto-purge)')
ON CONFLICT (data_type) DO NOTHING;

-- 5. Seed default field classifications for PII fields
INSERT INTO data_classifications (table_name, column_name, classification, contains_pii, pii_type, masking_required) VALUES
  ('employees', 'email', 'confidential', true, 'email', true),
  ('employees', 'phone', 'confidential', true, 'phone', true),
  ('employees', 'first_name', 'confidential', true, 'name', false),
  ('employees', 'last_name', 'confidential', true, 'name', false),
  ('employees', 'fema_id', 'restricted', true, 'id_number', true),
  ('profiles', 'email', 'confidential', true, 'email', true),
  ('profiles', 'full_name', 'confidential', true, 'name', false),
  ('certifications', 'certification_number', 'restricted', true, 'id_number', true),
  ('certifications', 'document_url', 'restricted', false, null, true),
  ('error_logs', 'user_email', 'confidential', true, 'email', true),
  ('error_logs', 'user_id', 'internal', true, null, false),
  ('audit_logs', 'changed_by', 'internal', true, null, false),
  ('cache_inventory', 'serial_number', 'confidential', false, null, true),
  ('equipment', 'serial_number', 'confidential', false, null, true)
ON CONFLICT (table_name, column_name) DO NOTHING;

-- 6. Comprehensive governance assessment RPC
CREATE OR REPLACE FUNCTION public.assess_data_governance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _policies jsonb;
  _classifications jsonb;
  _lineage_stats jsonb;
  _retention_warnings jsonb := '[]'::jsonb;
  _classification_coverage jsonb;
  _total_tables int;
  _classified_tables int;
  _pii_fields int;
  _masking_required int;
  _overdue_purges int := 0;
  _policy RECORD;
  _row_count bigint;
  _oldest_record timestamptz;
  _governance_score int := 0;
  _total_checks int := 0;
  _pass_checks int := 0;
BEGIN
  -- Get all policies with current data stats
  _policies := '[]'::jsonb;
  FOR _policy IN SELECT * FROM data_governance_policies ORDER BY data_type LOOP
    -- Get approximate row count
    BEGIN
      EXECUTE format('SELECT COUNT(*), MIN(created_at) FROM public.%I', _policy.data_type)
        INTO _row_count, _oldest_record;
    EXCEPTION WHEN OTHERS THEN
      _row_count := 0;
      _oldest_record := NULL;
    END;

    _policies := _policies || jsonb_build_array(jsonb_build_object(
      'data_type', _policy.data_type,
      'display_name', _policy.display_name,
      'retention_days', _policy.retention_days,
      'classification', _policy.classification,
      'contains_pii', _policy.contains_pii,
      'auto_purge_enabled', _policy.auto_purge_enabled,
      'purge_strategy', _policy.purge_strategy,
      'last_purge_at', _policy.last_purge_at,
      'last_purge_count', _policy.last_purge_count,
      'row_count', _row_count,
      'oldest_record', _oldest_record,
      'owner_team', _policy.owner_team
    ));

    -- Check retention compliance
    _total_checks := _total_checks + 1;
    IF _policy.retention_days > 0 AND _policy.auto_purge_enabled THEN
      IF _oldest_record IS NOT NULL AND _oldest_record < now() - (_policy.retention_days || ' days')::interval THEN
        _overdue_purges := _overdue_purges + 1;
        _retention_warnings := _retention_warnings || jsonb_build_array(jsonb_build_object(
          'severity', CASE WHEN _policy.contains_pii THEN 'high' ELSE 'medium' END,
          'data_type', _policy.display_name,
          'message', _policy.display_name || ' has records older than ' || _policy.retention_days || ' day retention policy',
          'recommendation', 'Run data purge for ' || _policy.data_type || ' to comply with retention policy'
        ));
      ELSE
        _pass_checks := _pass_checks + 1;
      END IF;
    ELSE
      _pass_checks := _pass_checks + 1;
    END IF;
  END LOOP;

  -- Classification coverage
  SELECT COUNT(DISTINCT table_name) INTO _total_tables
  FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  SELECT COUNT(DISTINCT table_name) INTO _classified_tables
  FROM data_classifications;

  SELECT COUNT(*) INTO _pii_fields
  FROM data_classifications WHERE contains_pii = true;

  SELECT COUNT(*) INTO _masking_required
  FROM data_classifications WHERE masking_required = true;

  _classification_coverage := jsonb_build_object(
    'total_tables', _total_tables,
    'classified_tables', _classified_tables,
    'coverage_pct', ROUND((_classified_tables::numeric / GREATEST(_total_tables, 1)) * 100),
    'pii_fields', _pii_fields,
    'masking_required', _masking_required
  );

  -- Classification coverage check
  _total_checks := _total_checks + 1;
  IF _classified_tables >= _total_tables * 0.3 THEN
    _pass_checks := _pass_checks + 1;
  ELSE
    _retention_warnings := _retention_warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'medium',
      'data_type', 'Data Classification',
      'message', 'Only ' || _classified_tables || ' of ' || _total_tables || ' tables have field classifications',
      'recommendation', 'Classify sensitive fields in remaining tables to improve governance coverage'
    ));
  END IF;

  -- PII masking check
  _total_checks := _total_checks + 1;
  IF _masking_required > 0 THEN
    _pass_checks := _pass_checks + 1;
  END IF;

  -- Lineage stats
  SELECT jsonb_build_object(
    'total_records', COUNT(*),
    'last_7d', COUNT(*) FILTER (WHERE performed_at > now() - interval '7 days'),
    'unique_sources', COUNT(DISTINCT source_table),
    'unique_targets', COUNT(DISTINCT target_table)
  ) INTO _lineage_stats
  FROM data_lineage;

  -- Lineage check
  _total_checks := _total_checks + 1;
  _pass_checks := _pass_checks + 1;

  -- Calculate governance score
  _governance_score := ROUND((_pass_checks::numeric / GREATEST(_total_checks, 1)) * 100);

  -- Get field classifications
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'table_name', table_name,
    'column_name', column_name,
    'classification', classification,
    'contains_pii', contains_pii,
    'pii_type', pii_type,
    'masking_required', masking_required,
    'encryption_required', encryption_required
  ) ORDER BY table_name, column_name), '[]'::jsonb) INTO _classifications
  FROM data_classifications;

  RETURN jsonb_build_object(
    'assessed_at', now(),
    'governance_score', _governance_score,
    'policies', _policies,
    'classifications', _classifications,
    'classification_coverage', _classification_coverage,
    'lineage_stats', _lineage_stats,
    'retention_warnings', _retention_warnings,
    'summary', jsonb_build_object(
      'total_policies', jsonb_array_length(_policies),
      'overdue_purges', _overdue_purges,
      'total_checks', _total_checks,
      'pass_checks', _pass_checks,
      'pii_fields', _pii_fields,
      'classified_tables', _classified_tables
    )
  );
END;
$$;

-- 7. Data purge execution RPC
CREATE OR REPLACE FUNCTION public.execute_data_purge(p_data_type TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _policy RECORD;
  _deleted int := 0;
  _cutoff timestamptz;
BEGIN
  SELECT * INTO _policy FROM data_governance_policies WHERE data_type = p_data_type;
  IF _policy IS NULL THEN
    RAISE EXCEPTION 'Unknown data type: %', p_data_type;
  END IF;

  IF _policy.retention_days <= 0 THEN
    RETURN jsonb_build_object('error', 'No retention policy set (retention_days=0), purge not allowed');
  END IF;

  IF NOT _policy.auto_purge_enabled THEN
    RETURN jsonb_build_object('error', 'Auto-purge is disabled for this data type');
  END IF;

  _cutoff := now() - (_policy.retention_days || ' days')::interval;

  -- Execute purge based on strategy
  IF _policy.purge_strategy = 'hard_delete' THEN
    EXECUTE format('DELETE FROM public.%I WHERE created_at < $1', _policy.data_type) USING _cutoff;
    GET DIAGNOSTICS _deleted = ROW_COUNT;
  ELSIF _policy.purge_strategy = 'soft_delete' THEN
    BEGIN
      EXECUTE format('UPDATE public.%I SET deleted_at = now() WHERE created_at < $1 AND deleted_at IS NULL', _policy.data_type) USING _cutoff;
      GET DIAGNOSTICS _deleted = ROW_COUNT;
    EXCEPTION WHEN OTHERS THEN
      -- Table doesn't have deleted_at, fall back to hard delete
      EXECUTE format('DELETE FROM public.%I WHERE created_at < $1', _policy.data_type) USING _cutoff;
      GET DIAGNOSTICS _deleted = ROW_COUNT;
    END;
  END IF;

  -- Update policy record
  UPDATE data_governance_policies
  SET last_purge_at = now(), last_purge_count = _deleted
  WHERE data_type = p_data_type;

  -- Record lineage
  INSERT INTO data_lineage (source_table, target_table, transformation_type, description, performed_by)
  VALUES (p_data_type, p_data_type, 'purge', 'Retention purge: ' || _deleted || ' records older than ' || _policy.retention_days || ' days', auth.uid());

  RETURN jsonb_build_object('success', true, 'deleted', _deleted, 'cutoff', _cutoff, 'strategy', _policy.purge_strategy);
END;
$$;
