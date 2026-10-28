-- Run ONLY in a disposable Supabase database after applying migrations.
-- Run as migration/admin role with permission to SET ROLE authenticated.
-- All fixture rows are rolled back. A failed assertion aborts this transaction.
\set ON_ERROR_STOP on
BEGIN;

-- Isolated synthetic identities; no production customer records are used.
INSERT INTO auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'fe100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase1-owner-a@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'fe100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase1-owner-b@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'fe100000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'phase1-member@example.test', '', now(), now(), now());

INSERT INTO public.workspace_members (workspace_owner_id, user_id, role, status)
VALUES ('fe100000-0000-4000-8000-000000000001',
        'fe100000-0000-4000-8000-000000000003', 'workspace_admin', 'active');

-- Verify permissions as the actual authenticated DB role with JWT sub claims.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'fe100000-0000-4000-8000-000000000001', true);
INSERT INTO public.staff (first_name, last_name, email, created_by)
VALUES ('Fixture', 'A', 'phase1-a@example.test', 'fe100000-0000-4000-8000-000000000001');

SELECT set_config('request.jwt.claim.sub', 'fe100000-0000-4000-8000-000000000002', true);
INSERT INTO public.staff (first_name, last_name, email, created_by)
VALUES ('Fixture', 'B', 'phase1-b@example.test', 'fe100000-0000-4000-8000-000000000002');

SELECT set_config('request.jwt.claim.sub', 'fe100000-0000-4000-8000-000000000003', true);

-- Member of A can read A and cannot read B.
DO $test$
DECLARE a_count int; b_count int;
BEGIN
  SELECT count(*) INTO a_count FROM public.staff WHERE email = 'phase1-a@example.test';
  SELECT count(*) INTO b_count FROM public.staff WHERE email = 'phase1-b@example.test';
  IF a_count <> 1 OR b_count <> 0 THEN
    RAISE EXCEPTION 'Staff SELECT cross-tenant isolation failed: A %, B %', a_count, b_count;
  END IF;
END $test$;

-- Authorized member can add a staff row to A.
INSERT INTO public.staff (first_name, last_name, email, created_by)
VALUES ('Member', 'A', 'phase1-member-a@example.test',
        'fe100000-0000-4000-8000-000000000001');

-- Forged B owner must fail on INSERT, not silently succeed.
DO $test$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.staff (first_name, last_name, email, created_by)
    VALUES ('Forged', 'B', 'phase1-forged-b@example.test',
            'fe100000-0000-4000-8000-000000000002');
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Cross-tenant staff INSERT succeeded'; END IF;
END $test$;

-- Forged UPDATE of A's existing row into B must fail WITH CHECK.
DO $test$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    UPDATE public.staff
       SET created_by = 'fe100000-0000-4000-8000-000000000002'
     WHERE email = 'phase1-a@example.test';
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Cross-tenant staff UPDATE succeeded'; END IF;
END $test$;

-- B records must be invisible to UPDATE/DELETE from A.
DO $test$
DECLARE affected int;
BEGIN
  UPDATE public.staff SET position = 'forged' WHERE email = 'phase1-b@example.test';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Cross-tenant UPDATE touched % rows', affected; END IF;
  DELETE FROM public.staff WHERE email = 'phase1-b@example.test';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Cross-tenant DELETE touched % rows', affected; END IF;
END $test$;

RESET ROLE;

-- Policy catalog guards: no unknown permissive staff policy and
-- custom_fields policies are assigned to the authenticated role only.
DO $test$
DECLARE unexpected text;
BEGIN
  SELECT string_agg(policyname, ', ') INTO unexpected
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'staff'
     AND policyname NOT IN (
       'staff_view_team', 'staff_super_admin_select',
       'staff_manage_insert', 'staff_manage_update', 'staff_manage_delete'
     );
  IF unexpected IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected staff RLS policies after migration: %', unexpected;
  END IF;

  IF (SELECT count(*) FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'custom_fields'
         AND policyname IN ('Workspace members can view custom fields',
                            'Workspace admins can manage custom fields')
         AND roles = ARRAY['authenticated']::name[]) <> 2 THEN
    RAISE EXCEPTION 'custom_fields role restriction missing';
  END IF;
END $test$;

ROLLBACK;
-- PASS: every assertion completed and test fixtures were rolled back.
