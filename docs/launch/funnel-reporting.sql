-- OpsManagerPro launch funnel reporting
-- Run as a super_admin or service role. The view excludes workspaces where
-- workspace_settings.exclude_from_metrics = true and Stripe test-mode events.

-- Last 14 UTC days by funnel stage.
SELECT
  event_date,
  event_type,
  event_count,
  workspace_count
FROM public.launch_funnel_daily
WHERE event_date >= (CURRENT_DATE - 13)
ORDER BY event_date DESC, event_type;

-- Prior 24 hours compared with the preceding 24 hours.
WITH periods AS (
  SELECT
    event_type,
    count(*) FILTER (
      WHERE created_at >= now() - interval '24 hours'
    ) AS current_24h,
    count(*) FILTER (
      WHERE created_at >= now() - interval '48 hours'
        AND created_at < now() - interval '24 hours'
    ) AS prior_24h
  FROM public.product_events pe
  LEFT JOIN public.workspace_settings ws
    ON ws.user_id = pe.workspace_id
  WHERE pe.event_type = ANY (ARRAY[
    'website_visited',
    'signup_completed',
    'workspace_created',
    'first_location_created',
    'first_inventory_created',
    'first_team_member_added',
    'first_operation_completed',
    'checkout_started',
    'subscription_activated',
    'subscription_cancelled'
  ])
    AND pe.created_at >= now() - interval '48 hours'
    AND pe.is_test = false
    AND COALESCE(ws.exclude_from_metrics, false) = false
  GROUP BY event_type
)
SELECT
  event_type,
  current_24h,
  prior_24h,
  current_24h - prior_24h AS change
FROM periods
ORDER BY event_type;

-- Mark a known internal/test workspace once; reports exclude its full history.
-- UPDATE public.workspace_settings
-- SET exclude_from_metrics = true
-- WHERE user_id = '<workspace-owner-uuid>'::uuid;
