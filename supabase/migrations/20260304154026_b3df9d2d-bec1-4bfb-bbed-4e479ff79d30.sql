
-- Tighten insert policy to require user_id match
DROP POLICY "Authenticated users can insert error logs" ON public.error_logs;
CREATE POLICY "Authenticated users can insert own error logs"
  ON public.error_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
