
-- Invalidate cached team member lists so fresh data is served
-- Bump all cache versions for team_members_list resource
UPDATE public.api_cache_versions 
SET version = version + 1, updated_at = now()
WHERE resource = 'team_members_list';
