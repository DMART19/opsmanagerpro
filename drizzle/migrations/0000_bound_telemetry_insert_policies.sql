-- Pin telemetry inserts to the calling user and bound the values they can claim.

DROP POLICY IF EXISTS "Users can insert friction events" ON public.friction_events;
CREATE POLICY "Users insert own friction events"
ON public.friction_events FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND event_type IN ('validation_error','rage_click','abandoned_workflow','repeated_action','gated_feature_attempt','disabled_click')
  AND (page_route IS NULL OR length(page_route) <= 300)
  AND (element_label IS NULL OR length(element_label) <= 300)
  AND (session_id IS NULL OR length(session_id) <= 100)
);

DROP POLICY IF EXISTS "Users can insert workflow events" ON public.workflow_events;
CREATE POLICY "Users insert own workflow events"
ON public.workflow_events FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND length(workflow_name) BETWEEN 1 AND 200
  AND step IN ('started','completed','abandoned')
);

DROP POLICY IF EXISTS "Users can insert performance events" ON public.page_performance;
CREATE POLICY "Users insert own page performance"
ON public.page_performance FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND length(page_route) BETWEEN 1 AND 300
  AND load_time_ms >= 0 AND load_time_ms <= 600000
);

DROP POLICY IF EXISTS "Anyone can insert performance metrics" ON public.performance_metrics;
CREATE POLICY "Users insert own performance metrics"
ON public.performance_metrics FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND length(metric_type) BETWEEN 1 AND 100
  AND length(metric_name) BETWEEN 1 AND 200
  AND value_ms >= 0 AND value_ms <= 600000
  AND (session_id IS NULL OR length(session_id) <= 100)
);

DROP POLICY IF EXISTS "Authenticated users can submit demo feedback" ON public.demo_feedback;
CREATE POLICY "Users submit bounded demo feedback"
ON public.demo_feedback FOR INSERT TO authenticated
WITH CHECK (
  rating BETWEEN 1 AND 5
  AND user_type IN ('user','demo','visitor','prospect')
  AND length(page_route) BETWEEN 1 AND 300
  AND (feature_name IS NULL OR length(feature_name) <= 200)
  AND (feedback_text IS NULL OR length(feedback_text) <= 5000)
  AND (email IS NULL OR length(email) <= 320)
  AND (tags IS NULL OR array_length(tags, 1) <= 20)
  AND (session_id IS NULL OR length(session_id) <= 100)
);