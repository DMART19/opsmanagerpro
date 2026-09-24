
-- Drop the problematic policy that references auth.users directly
DROP POLICY IF EXISTS "Users can read pending invites by email" ON public.workspace_invites;

-- Create a security definer function to safely check user email
CREATE OR REPLACE FUNCTION public.get_auth_email(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = p_user_id;
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Users can read pending invites by email or token"
ON public.workspace_invites
FOR SELECT
TO authenticated
USING (
  workspace_owner_id = auth.uid()
  OR (
    status = 'pending'
    AND (
      email = '' 
      OR email IS NULL 
      OR lower(email) = lower(public.get_auth_email(auth.uid()))
    )
  )
);
