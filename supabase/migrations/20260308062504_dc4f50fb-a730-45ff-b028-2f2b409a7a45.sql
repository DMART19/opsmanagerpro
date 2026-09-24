
CREATE TABLE public.user_guidance_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  guidance_id TEXT NOT NULL,
  seen BOOLEAN NOT NULL DEFAULT false,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, guidance_id)
);

ALTER TABLE public.user_guidance_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own guidance progress"
  ON public.user_guidance_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own guidance progress"
  ON public.user_guidance_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own guidance progress"
  ON public.user_guidance_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
