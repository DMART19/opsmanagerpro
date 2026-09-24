
-- Add route column to user_guidance_progress
ALTER TABLE public.user_guidance_progress 
ADD COLUMN IF NOT EXISTS route text;

-- Create index for route-based queries
CREATE INDEX IF NOT EXISTS idx_user_guidance_route 
ON public.user_guidance_progress(user_id, route);
