
-- Add user_email column to error_logs
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS user_email text;

-- Drop existing overloaded functions and recreate with user_email support
DROP FUNCTION IF EXISTS public.upsert_error_log(uuid, text, text, text, text, text, text, integer, text, text);
DROP FUNCTION IF EXISTS public.upsert_error_log(uuid, text, text, text, text, text, text, integer, text, text, jsonb);
DROP FUNCTION IF EXISTS public.upsert_error_log(uuid, text, text, text, text, text, text, integer, text, text, jsonb, uuid);

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
  p_replay_bundle jsonb DEFAULT NULL::jsonb,
  p_workspace_id uuid DEFAULT NULL::uuid,
  p_user_email text DEFAULT NULL::text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        workspace_id = COALESCE(p_workspace_id, workspace_id),
        user_email = COALESCE(p_user_email, user_email),
        user_id = COALESCE(p_user_id, user_id)
    WHERE id = existing_id;
  ELSE
    INSERT INTO public.error_logs (
      user_id, severity, message, stack_trace, page_route,
      browser_info, api_endpoint, api_status_code, request_method,
      error_hash, last_seen_at, replay_bundle, workspace_id, user_email
    ) VALUES (
      p_user_id, p_severity, p_message, p_stack_trace, p_page_route,
      p_browser_info, p_api_endpoint, p_api_status_code, p_request_method,
      p_error_hash, now(), p_replay_bundle, p_workspace_id, p_user_email
    );
  END IF;
END;
$function$;
