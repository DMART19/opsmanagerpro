
-- Add has_seed_data flag to workspace_settings
ALTER TABLE public.workspace_settings
ADD COLUMN IF NOT EXISTS has_seed_data boolean DEFAULT false;
