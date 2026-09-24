REVOKE ALL ON FUNCTION public.plan_check_feature(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.plan_owner_for_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_plan_feature() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_warehouse_limit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plan_check_feature(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.plan_owner_for_user(uuid) TO service_role;