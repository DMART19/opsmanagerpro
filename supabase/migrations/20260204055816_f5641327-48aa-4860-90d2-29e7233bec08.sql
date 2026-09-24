-- Remove dangerous anonymous access policies from tasks table
-- These policies allow anyone on the internet to access task data without authentication

DROP POLICY IF EXISTS "Anonymous users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Anonymous users can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Anonymous users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Anonymous users can view tasks" ON public.tasks;

-- The existing user-scoped policies remain in place:
-- - "Users can view own tasks" (auth.uid() = user_id)
-- - "Users can insert own tasks" (auth.uid() = user_id)
-- - "Users can update own tasks" (auth.uid() = user_id)
-- - "Users can delete own tasks" (auth.uid() = user_id)