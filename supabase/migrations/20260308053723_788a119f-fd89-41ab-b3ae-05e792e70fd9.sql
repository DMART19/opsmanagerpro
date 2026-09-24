-- Restrict demo_feedback INSERT to require at least authentication
DROP POLICY IF EXISTS "Anyone can submit demo feedback" ON public.demo_feedback;
CREATE POLICY "Authenticated users can submit demo feedback"
ON public.demo_feedback FOR INSERT
TO authenticated
WITH CHECK (true);