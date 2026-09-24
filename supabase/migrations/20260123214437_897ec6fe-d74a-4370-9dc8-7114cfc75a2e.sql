-- Fix: Staff table - restrict SELECT to managers/admins only
-- The staff table contains sensitive PII (email, phone, address, emergency contacts)
-- Currently exposed to all authenticated users via USING (true)

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Staff viewable by all authenticated users" ON public.staff;

-- Create restrictive policy - managers and admins can view all staff records
CREATE POLICY "Managers and admins can view all staff"
ON public.staff
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- Allow staff to view their own record if linked via user_id
CREATE POLICY "Staff can view own record"
ON public.staff
FOR SELECT
USING (user_id = auth.uid());