-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to postgres
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create a function to call the demo-cleanup edge function
CREATE OR REPLACE FUNCTION public.trigger_demo_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  response_status int;
BEGIN
  -- Make HTTP request to the edge function
  SELECT status INTO response_status
  FROM extensions.http((
    'POST',
    current_setting('app.settings.supabase_url', true) || '/functions/v1/demo-cleanup',
    ARRAY[
      extensions.http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)),
      extensions.http_header('Content-Type', 'application/json')
    ],
    'application/json',
    '{}'
  )::extensions.http_request);
  
  RAISE NOTICE 'Demo cleanup triggered with status: %', response_status;
END;
$$;

-- Schedule the cleanup to run every hour
SELECT cron.schedule(
  'demo-cleanup-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/demo-cleanup',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);