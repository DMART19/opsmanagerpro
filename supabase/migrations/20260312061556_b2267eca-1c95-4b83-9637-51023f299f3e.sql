
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_use_case text;

-- Mark existing users with display_name as onboarded
UPDATE public.profiles SET onboarding_complete = true WHERE display_name IS NOT NULL AND display_name != '';
