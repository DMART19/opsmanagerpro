-- Drop the overly permissive insert policy and replace with a proper one
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;

-- Create a proper insert policy that only allows inserting for the target user
-- This allows edge functions (which use service role) to insert, and users can insert for themselves
CREATE POLICY "Allow inserting notifications for user"
ON public.user_notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');