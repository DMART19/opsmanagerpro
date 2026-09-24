-- Create or replace the upsert_error_log function to accept workspace_id
CREATE OR REPLACE FUNCTION public.upsert_error_log(
  p_user_id UUID,
  p_severity TEXT,
  p_message TEXT,
  p_stack_trace TEXT,
  p_page_route TEXT,
  p_browser_info TEXT,
  p_api_endpoint TEXT,
  p_api_status_code INTEGER,
  p_request_method TEXT,
  p_error_hash TEXT,
  p_replay_bundle JSONB DEFAULT NULL,
  p_workspace_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
        replay_bundle = COALESCE(p_replay_bundle, replay_bundle),
        workspace_id = COALESCE(p_workspace_id, workspace_id)
    WHERE id = existing_id;
  ELSE
    INSERT INTO public.error_logs (
      user_id, severity, message, stack_trace, page_route,
      browser_info, api_endpoint, api_status_code, request_method,
      error_hash, last_seen_at, replay_bundle, workspace_id
    ) VALUES (
      p_user_id, p_severity, p_message, p_stack_trace, p_page_route,
      p_browser_info, p_api_endpoint, p_api_status_code, p_request_method,
      p_error_hash, now(), p_replay_bundle, p_workspace_id
    );
  END IF;
END;
$$;