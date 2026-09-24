
-- Add last_seen_at for dedup tracking and severity 'info' support
ALTER TABLE public.error_logs DROP CONSTRAINT IF EXISTS error_logs_severity_check;
ALTER TABLE public.error_logs ADD CONSTRAINT error_logs_severity_check CHECK (severity IN ('critical', 'error', 'warn', 'info'));

ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS request_method TEXT;

-- Create dedup function: upsert based on error_hash within 5 min window
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
  p_error_hash TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_id UUID;
BEGIN
  -- Look for a matching unresolved error within the last 5 minutes
  SELECT id INTO existing_id
  FROM public.error_logs
  WHERE error_hash = p_error_hash
    AND status = 'unresolved'
    AND last_seen_at > (now() - interval '5 minutes')
  ORDER BY last_seen_at DESC
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    -- Dedupe: increment count and update last_seen_at
    UPDATE public.error_logs
    SET hit_count = hit_count + 1,
        last_seen_at = now(),
        updated_at = now()
    WHERE id = existing_id;
  ELSE
    -- Insert new error log
    INSERT INTO public.error_logs (
      user_id, severity, message, stack_trace, page_route,
      browser_info, api_endpoint, api_status_code, request_method,
      error_hash, last_seen_at
    ) VALUES (
      p_user_id, p_severity, p_message, p_stack_trace, p_page_route,
      p_browser_info, p_api_endpoint, p_api_status_code, p_request_method,
      p_error_hash, now()
    );
  END IF;
END;
$$;
