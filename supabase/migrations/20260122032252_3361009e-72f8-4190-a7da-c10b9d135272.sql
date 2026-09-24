-- Fix 1: Profiles table - restrict SELECT to own profile only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;

-- Create restrictive policy - users can only view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Allow admins to view all profiles for admin functions
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));


-- Fix 2: Support messages - remove NULL user_id exposure
-- Drop the policy that exposes NULL user_id messages
DROP POLICY IF EXISTS "Users can view their own support messages" ON public.support_messages;

-- Create restrictive policy - users can only view messages with their own user_id (NOT NULL)
CREATE POLICY "Users can view their own support messages"
ON public.support_messages
FOR SELECT
USING (auth.uid() = user_id);