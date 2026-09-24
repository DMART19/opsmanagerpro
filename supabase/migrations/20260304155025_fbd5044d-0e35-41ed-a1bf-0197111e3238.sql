
-- Add replay_bundle column to error_logs for breadcrumb data
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS replay_bundle JSONB;

-- Update the upsert function to accept replay_bundle
CREATE OR REPLACE FUNCTION public.upsert_error_log(
  p_user_id uuid,
  p_severity text,
  p_message text,
  p_stack_trace text,
  p_page_route text,
  p_browser_info text,
  p_api_endpoint text,
  p_api_status_code integer,
  p_request_method text,
  p_error_hash text,
  p_replay_bundle jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_id UUID;
BEGIN
  SELECT id INTO existing_id
  FROM public.error_logs
  WHERE error_hash = p_error_hash
    AND status = 'unresolved'
    AND last_seen_at > (now() - interval '5 minutes')
  ORDER BY last_seen_at DESC
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.error_logs
    SET hit_count = hit_count + 1,
        last_seen_at = now(),
        updated_at = now(),
        replay_bundle = COALESCE(p_replay_bundle, replay_bundle)
    WHERE id = existing_id;
  ELSE
    INSERT INTO public.error_logs (
      user_id, severity, message, stack_trace, page_route,
      browser_info, api_endpoint, api_status_code, request_method,
      error_hash, last_seen_at, replay_bundle
    ) VALUES (
      p_user_id, p_severity, p_message, p_stack_trace, p_page_route,
      p_browser_info, p_api_endpoint, p_api_status_code, p_request_method,
      p_error_hash, now(), p_replay_bundle
    );
  END IF;
END;
$$;
