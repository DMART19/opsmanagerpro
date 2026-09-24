
-- Bust the stale assets_list cache for all users so containers appear immediately
UPDATE public.api_cache_versions
SET version = version + 1, updated_at = now()
WHERE resource = 'assets_list';
