
-- 1. Remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_alerts;
ALTER PUBLICATION supabase_realtime DROP TABLE public.deletion_requests;
ALTER PUBLICATION supabase_realtime DROP TABLE public.error_logs;

-- 2. Fix user_notifications INSERT policy: do not trust JWT 'role' claim
DROP POLICY IF EXISTS "Allow inserting notifications for user" ON public.user_notifications;

CREATE POLICY "Users can insert their own notifications"
ON public.user_notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
ON public.user_notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3. Set fixed search_path on functions missing it
ALTER FUNCTION public.enforce_asset_workspace_scope() SET search_path = public;
ALTER FUNCTION public.enforce_container_workspace_scope() SET search_path = public;
ALTER FUNCTION public.prevent_duplicate_employee_email() SET search_path = public;
ALTER FUNCTION public.onboarding_mark_container_created() SET search_path = public;
ALTER FUNCTION public.onboarding_mark_asset_created() SET search_path = public;
ALTER FUNCTION public.onboarding_mark_event_created() SET search_path = public;
ALTER FUNCTION public.ensure_onboarding_row() SET search_path = public;
ALTER FUNCTION public.trim_performance_metrics() SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
