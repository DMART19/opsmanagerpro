-- Helper: caller may only act on their own user id (service role / internal calls and super admins exempt)
CREATE OR REPLACE FUNCTION public.assert_self_or_service(p_user_id uuid, p_allow_null boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(auth.role(), '') IN ('', 'service_role') THEN RETURN; END IF;
  IF p_user_id IS NULL AND p_allow_null THEN RETURN; END IF;
  IF auth.uid() IS NOT NULL AND (p_user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin')) THEN RETURN; END IF;
  RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION public.assert_self_or_service(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_self_or_service(uuid, boolean) TO authenticated, service_role;

-- Inject the guard into plpgsql functions that take p_user_id
DO $do$
DECLARE r record; def text; allow_null text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN
      ('get_dashboard_kpis','ensure_workspace_integrity','get_or_init_cache_version','accept_workspace_invite',
       'check_rate_limit','log_security_event','upsert_error_log')
  LOOP
    def := pg_get_functiondef(r.oid);
    IF position('assert_self_or_service' in def) > 0 THEN CONTINUE; END IF;
    allow_null := CASE WHEN r.proname IN ('log_security_event','upsert_error_log') THEN 'true' ELSE 'false' END;
    def := regexp_replace(def, '\mBEGIN\M',
      'BEGIN' || chr(10) || '  PERFORM public.assert_self_or_service(p_user_id, ' || allow_null || ');');
    EXECUTE def;
  END LOOP;
END
$do$;

-- SQL-language functions: rewrite with the guard
CREATE OR REPLACE FUNCTION public.increment_login_count(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_self_or_service(p_user_id, false);
  UPDATE public.profiles SET login_count = COALESCE(login_count, 0) + 1 WHERE id = p_user_id;
END;
$$;

-- get_auth_email is not used by the app; keep it server-only
REVOKE EXECUTE ON FUNCTION public.get_auth_email(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_email(uuid) TO service_role;

-- Signed-out visitors never need these
REVOKE EXECUTE ON FUNCTION public.get_dashboard_kpis(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_workspace_integrity(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_or_init_cache_version(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_login_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_workspace_invite(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.archive_workspace(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restore_workspace(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_workspace_snapshot(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restore_workspace_snapshot(uuid, uuid, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis(uuid), public.ensure_workspace_integrity(uuid),
  public.get_or_init_cache_version(uuid, text), public.increment_login_count(uuid),
  public.accept_workspace_invite(text, uuid) TO authenticated, service_role;