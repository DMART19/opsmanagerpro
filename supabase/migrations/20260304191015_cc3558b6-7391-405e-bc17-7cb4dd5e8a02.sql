
-- Product events table for lightweight action tracking
CREATE TABLE public.product_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  workspace_id uuid NULL,
  user_id uuid NULL,
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for querying by type and time
CREATE INDEX idx_product_events_type_created ON public.product_events (event_type, created_at DESC);
CREATE INDEX idx_product_events_user ON public.product_events (user_id, created_at DESC);
CREATE INDEX idx_product_events_created ON public.product_events (created_at DESC);

-- Enable RLS
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can insert their own events
CREATE POLICY "Users can insert own events"
  ON public.product_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can view all events
CREATE POLICY "Admins can view all events"
  ON public.product_events
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own events
CREATE POLICY "Users can view own events"
  ON public.product_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Auto-trim trigger: keep only most recent 10,000 events
CREATE OR REPLACE FUNCTION public.trim_product_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.product_events
  WHERE id NOT IN (
    SELECT id FROM public.product_events
    ORDER BY created_at DESC
    LIMIT 10000
  );
  RETURN NULL;
END;
$$;

-- Fire trim every 100 inserts (approximate via a statement-level trigger)
CREATE TRIGGER trg_trim_product_events
  AFTER INSERT ON public.product_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trim_product_events();
