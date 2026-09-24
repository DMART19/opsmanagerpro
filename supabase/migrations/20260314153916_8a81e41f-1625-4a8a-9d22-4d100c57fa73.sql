
-- Add adaptive onboarding columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS login_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS signup_source text DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS team_size text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS profile_completeness integer NOT NULL DEFAULT 0;
