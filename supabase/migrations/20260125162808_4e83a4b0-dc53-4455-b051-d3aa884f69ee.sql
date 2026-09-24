-- Fix support_messages INSERT policy to require authentication
-- Drop the overly permissive "Anyone can create support messages" policy
DROP POLICY IF EXISTS "Anyone can create support messages" ON public.support_messages;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can create support messages"
ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);