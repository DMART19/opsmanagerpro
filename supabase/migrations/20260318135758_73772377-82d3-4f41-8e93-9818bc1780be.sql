CREATE TABLE public.requirement_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  requirement_id TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.requirement_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own audit logs"
  ON public.requirement_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own audit logs"
  ON public.requirement_audit_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);