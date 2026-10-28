-- Read-only Phase 1 authorization inventory. Run against STAGING first.
-- Review output manually; public policies can be legitimate for truly public data.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced,
       count(p.policyname) AS policy_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
 WHERE n.nspname IN ('public','storage') AND c.relkind IN ('r','p')
 GROUP BY n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
 ORDER BY n.nspname, c.relname;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
  FROM pg_policies
 WHERE schemaname IN ('public', 'storage')
 ORDER BY schemaname, tablename, policyname;

-- Flag potential policy review candidates; NOT a proof of exploitability.
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
  FROM pg_policies
 WHERE schemaname IN ('public', 'storage')
   AND (
     'public' = ANY(roles)
     OR (qual ~* '(^|[^a-z])true([^a-z]|$)')
     OR (with_check ~* '(^|[^a-z])true([^a-z]|$)')
   )
 ORDER BY schemaname, tablename, policyname;

-- Confirm specific P0 policies after applying the migration.
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename IN ('staff', 'custom_fields')
 ORDER BY tablename, policyname;
