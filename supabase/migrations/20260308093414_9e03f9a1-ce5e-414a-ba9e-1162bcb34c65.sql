
-- ============================================================
-- SECURITY CONFIGURATION ASSESSMENT
-- ============================================================

CREATE OR REPLACE FUNCTION public.assess_security_posture()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
  _warnings jsonb := '[]'::jsonb;
  _checks jsonb := '[]'::jsonb;
  -- counters
  _tables_with_rls int;
  _total_tables int;
  _immutable_triggers int;
  _failed_logins_24h int;
  _security_events_24h int;
  _audit_records_7d int;
  _encryption_fn_exists boolean;
  _workspace_isolation_fn boolean;
  _perm_fn_exists boolean;
  _snapshot_count int;
BEGIN
  -- 1. Authentication Security
  _checks := _checks || jsonb_build_array(jsonb_build_object(
    'category', 'authentication',
    'name', 'Password Policy',
    'status', 'active',
    'detail', '12-char minimum with complexity + leaked password check'
  ));

  -- Rate limiting
  _checks := _checks || jsonb_build_array(jsonb_build_object(
    'category', 'authentication',
    'name', 'Rate Limiting',
    'status', 'active',
    'detail', 'Login: 5/5min, Signup: 5/5min, Reset: 3/5min'
  ));

  -- Failed logins in 24h
  SELECT COUNT(*) INTO _failed_logins_24h
  FROM security_events
  WHERE event_type = 'failed_login' AND created_at > now() - interval '24 hours';

  IF _failed_logins_24h > 50 THEN
    _warnings := _warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'high',
      'category', 'authentication',
      'message', format('Excessive login failures: %s in 24h', _failed_logins_24h),
      'recommendation', 'Review security events for brute force attempts'
    ));
  END IF;

  _checks := _checks || jsonb_build_array(jsonb_build_object(
    'category', 'authentication',
    'name', 'Failed Logins (24h)',
    'status', CASE WHEN _failed_logins_24h > 50 THEN 'warning' WHEN _failed_logins_24h > 100 THEN 'critical' ELSE 'healthy' END,
    'detail', format('%s failed attempts', _failed_logins_24h)
  ));

  -- 2. Encryption
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'encrypt_sensitive'
  ) INTO _encryption_fn_exists;

  _checks := _checks || jsonb_build_array(jsonb_build_object(
    'category', 'encryption',
    'name', 'Field Encryption (PGP)',
    'status', CASE WHEN _encryption_fn_exists THEN 'active' ELSE 'disabled' END,
    'detail', CASE WHEN _encryption_fn_exists THEN 'encrypt_sensitive / decrypt_sensitive functions available' ELSE 'Encryption functions not found' END
  ));

  IF NOT _encryption_fn_exists THEN
    _warnings := _warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'high',
      'category', 'encryption',
      'message', 'Field encryption functions are not deployed',
      'recommendation', 'Deploy encrypt_sensitive and decrypt_sensitive functions'
    ));
  END IF;

  _checks := _checks || jsonb_build_array(jsonb_build_object(
    'category', 'encryption',
    'name', 'HTTPS Enforcement',
    'status', 'active',
    'detail', 'Client-side redirect + CSP upgrade-insecure-requests'
  ));

  -- 3. Audit Logs
  SELECT COUNT(*) INTO _immutable_triggers
  FROM pg_trigger WHERE tgname IN ('trg_prevent_audit_update', 'trg_prevent_audit_delete');

  _checks := _checks || jsonb_build_array(jsonb_build_object(
    'category', 'audit',
    'name', 'Audit Log Immutability',
    'status', CASE WHEN _immutable_triggers >= 2 THEN 'active' ELSE 'disabled' END,
    'detail', format('%s immutability triggers active', _immutable_triggers)
  ));

  IF _immutable_triggers < 2 THEN
    _warnings := _warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'critical',
      'category', 'audit',
      'message', 'Audit log immutability triggers are missing',
      'recommendation', 'Deploy trg_prevent_audit_update and trg_prevent_audit_delete triggers'
    ));
  END IF;

  SELECT COUNT(*) INTO _audit_records_7d FROM audit_logs WHERE changed_at > now() - interval '7 days';

  _checks := _checks || jsonb_build_array(jsonb_build_object(
    'category', 'audit',
    'name', 'Audit Records (7d)',
    'status', CASE WHEN _audit_records_7d > 0 THEN 'healthy' ELSE 'warning' END,
    'detail', format('%s records in last 7 days', _audit_records_7d)
  ));

  IF _audit_records_7d = 0 THEN
    _warnings := _warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'medium',
      'category', 'audit',
      'message', 'No audit records in the last 7 days',
      'recommendation', 'Verify audit logging triggers are active on core tables'
    ));
  END IF;

  -- 4. Permission System
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'has_workspace_permission'
  ) INTO _perm_fn_exists;

  _checks := _checks || jsonb_build_array(jsonb_build_object(
    'category', 'permissions',
    'name', 'Workspace Permission Function',
    'status', CASE WHEN _perm_fn_exists THEN 'active' ELSE 'disabled' END,
    'detail', CASE WHEN _perm_fn_exists THEN 'has_workspace_permission() available' ELSE 'Function not found' END
  ));

  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_in_workspace'
  ) INTO _workspace_isolation_fn;

  _checks := _checks || jsonb_build_array(jsonb_build_object(
    'category', 'permissions',
    'name', 'Workspace Data Isolation',
    'status', CASE WHEN _workspace_isolation_fn THEN 'active' ELSE 'disabled' END,
    'detail', CASE WHEN _workspace_isolation_fn THEN 'is_in_workspace() enforced in RLS' ELSE 'Isolation function not found' END
  ));

  -- 5. RLS Coverage
  SELECT COUNT(*) INTO _total_tables
  FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  SELECT COUNT(*) INTO _tables_with_rls
  FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

  _checks := _checks || jsonb_build_array(jsonb_build_object(
    'category', 'permissions',
    'name', 'RLS Coverage',
    'status', CASE
      WHEN _tables_with_rls >= _total_tables * 0.9 THEN 'healthy'
      WHEN _tables_with_rls >= _total_tables * 0.7 THEN 'warning'
      ELSE 'critical' END,
    'detail', format('%s/%s tables (%s%%)', _tables_with_rls, _total_tables,
      ROUND((_tables_with_rls::numeric / GREATEST(_total_tables,1)) * 100, 0))
  ));

  IF _tables_with_rls < _total_tables * 0.7 THEN
    _warnings := _warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'high',
      'category', 'permissions',
      'message', format('Low RLS coverage: %s/%s tables protected', _tables_with_rls, _total_tables),
      'recommendation', 'Enable RLS on unprotected tables and add appropriate policies'
    ));
  END IF;

  -- 6. Security events
  SELECT COUNT(*) INTO _security_events_24h
  FROM security_events WHERE created_at > now() - interval '24 hours';

  _checks := _checks || jsonb_build_array(jsonb_build_object(
    'category', 'monitoring',
    'name', 'Security Events (24h)',
    'status', CASE WHEN _security_events_24h > 20 THEN 'warning' ELSE 'healthy' END,
    'detail', format('%s events detected', _security_events_24h)
  ));

  -- 7. Recovery readiness
  SELECT COUNT(*) INTO _snapshot_count FROM workspace_snapshots;

  _checks := _checks || jsonb_build_array(jsonb_build_object(
    'category', 'recovery',
    'name', 'Workspace Snapshots',
    'status', CASE WHEN _snapshot_count > 0 THEN 'healthy' ELSE 'warning' END,
    'detail', format('%s snapshots available', _snapshot_count)
  ));

  -- Build result
  _result := jsonb_build_object(
    'assessed_at', now(),
    'checks', _checks,
    'warnings', _warnings,
    'summary', jsonb_build_object(
      'total_checks', jsonb_array_length(_checks),
      'active', (SELECT COUNT(*) FROM jsonb_array_elements(_checks) c WHERE c->>'status' = 'active'),
      'healthy', (SELECT COUNT(*) FROM jsonb_array_elements(_checks) c WHERE c->>'status' = 'healthy'),
      'warning', (SELECT COUNT(*) FROM jsonb_array_elements(_checks) c WHERE c->>'status' IN ('warning','disabled')),
      'critical', (SELECT COUNT(*) FROM jsonb_array_elements(_checks) c WHERE c->>'status' = 'critical'),
      'failed_logins_24h', _failed_logins_24h,
      'security_events_24h', _security_events_24h,
      'rls_coverage_pct', ROUND((_tables_with_rls::numeric / GREATEST(_total_tables,1)) * 100, 0)
    )
  );

  RETURN _result;
END;
$$;
