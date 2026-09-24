
CREATE TABLE public.system_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active announcements
CREATE POLICY "Anyone can view active announcements"
ON public.system_announcements
FOR SELECT
TO authenticated
USING (is_active = true AND start_date <= now() AND (end_date IS NULL OR end_date > now()));

-- Anon users can also view (for demo/landing)
CREATE POLICY "Anon can view active announcements"
ON public.system_announcements
FOR SELECT
TO anon
USING (is_active = true AND start_date <= now() AND (end_date IS NULL OR end_date > now()));

-- Only admins can manage
CREATE POLICY "Admins can manage announcements"
ON public.system_announcements
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
