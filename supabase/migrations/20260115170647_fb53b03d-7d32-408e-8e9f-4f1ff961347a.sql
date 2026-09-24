-- Add a more permissive INSERT policy for cache_inventory
-- Allow any authenticated user to insert items
CREATE POLICY "Authenticated users can insert cache inventory" 
ON public.cache_inventory 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure we have a policy for anon users to read (for public display if needed)
-- Keep existing policies for UPDATE/DELETE that require roles