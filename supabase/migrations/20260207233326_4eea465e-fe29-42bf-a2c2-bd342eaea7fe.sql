
-- Fix PUBLIC_WAREHOUSE_DATA: warehouse_sections table exposed to all authenticated users
-- The current policy "Sections viewable by all authenticated users" uses USING (true)
-- which exposes sensitive operational data including GPS coordinates and capacity info

-- Step 1: Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Sections viewable by all authenticated users" ON public.warehouse_sections;

-- Step 2: Create a proper owner-scoped SELECT policy
-- Users can only view sections they created
CREATE POLICY "Users can view own warehouse sections"
ON public.warehouse_sections
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Note: The existing policies remain in place:
-- - "Managers and admins can manage sections" - for admin/manager access via has_role()
-- - "Demo users can manage sections in demo warehouse" - for demo functionality
