
-- =====================================================================
-- Phase 1 Security Hardening
-- =====================================================================

-- 1) Rate-limit increment RPC used by edge functions.
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_key text,
  p_user_id uuid,
  p_window_start timestamptz
)
RETURNS TABLE(hit_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.rate_limits
     SET hit_count = rate_limits.hit_count + 1
   WHERE rate_limits.key = p_key
     AND rate_limits.user_id = p_user_id
     AND rate_limits.window_start = p_window_start
  RETURNING rate_limits.hit_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_rate_limit(text, uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(text, uuid, timestamptz) TO service_role;

-- 2) Telemetry tables: drop anon writes; require authenticated user.
DROP POLICY IF EXISTS "Anon can insert friction events" ON public.friction_events;
DROP POLICY IF EXISTS "Anon can insert performance events" ON public.page_performance;
DROP POLICY IF EXISTS "Anon can insert workflow events" ON public.workflow_events;

REVOKE INSERT ON public.friction_events FROM anon;
REVOKE INSERT ON public.page_performance FROM anon;
REVOKE INSERT ON public.workflow_events FROM anon;

-- 3) Tighten public 'uploads' bucket: INSERT must place files under the
--    authenticated user's own folder (matches existing UPDATE/DELETE scoping).
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
