
-- Friction events: tracks user struggle signals
CREATE TABLE public.friction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id TEXT,
  event_type TEXT NOT NULL, -- 'validation_error', 'rage_click', 'abandoned_workflow', 'repeated_action'
  page_route TEXT,
  element_label TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for analytics queries
CREATE INDEX idx_friction_events_type_created ON public.friction_events (event_type, created_at DESC);
CREATE INDEX idx_friction_events_route ON public.friction_events (page_route, created_at DESC);

-- Workflow events: tracks workflow start/complete pairs
CREATE TABLE public.workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  workflow_name TEXT NOT NULL, -- 'invite_team', 'move_item', 'asset_creation', etc.
  step TEXT NOT NULL, -- 'started', 'completed', 'abandoned'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_events_name_step ON public.workflow_events (workflow_name, step, created_at DESC);

-- Page performance events
CREATE TABLE public.page_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_route TEXT NOT NULL,
  load_time_ms INTEGER NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_performance_route ON public.page_performance (page_route, created_at DESC);

-- Auto-trim friction_events to 50k rows
CREATE OR REPLACE FUNCTION public.trim_friction_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.friction_events
  WHERE id NOT IN (
    SELECT id FROM public.friction_events
    ORDER BY created_at DESC
    LIMIT 50000
  );
  RETURN NULL;
END;
$$;

CREATE TRIGGER trim_friction_events_trigger
AFTER INSERT ON public.friction_events
FOR EACH STATEMENT
EXECUTE FUNCTION public.trim_friction_events();

-- Enable RLS but allow inserts from authenticated users
ALTER TABLE public.friction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_performance ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own events
CREATE POLICY "Users can insert friction events" ON public.friction_events
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can insert workflow events" ON public.workflow_events
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can insert performance events" ON public.page_performance
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow super_admin to read all
CREATE POLICY "Admins can read friction events" ON public.friction_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can read workflow events" ON public.workflow_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can read performance events" ON public.page_performance
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Also allow anon inserts for demo users
CREATE POLICY "Anon can insert friction events" ON public.friction_events
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can insert workflow events" ON public.workflow_events
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can insert performance events" ON public.page_performance
  FOR INSERT TO anon WITH CHECK (true);
