-- Create feedback table for demo user insights
CREATE TABLE public.demo_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  tags TEXT[] DEFAULT '{}',
  feedback_text TEXT,
  email TEXT,
  page_route TEXT NOT NULL,
  feature_name TEXT,
  user_type TEXT NOT NULL DEFAULT 'demo',
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (demo users aren't authenticated)
CREATE POLICY "Anyone can submit demo feedback"
ON public.demo_feedback
FOR INSERT
WITH CHECK (true);

-- Only authenticated admins can view feedback
CREATE POLICY "Admins can view feedback"
ON public.demo_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);