
CREATE TABLE public.snapshot_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id uuid,
  action_type text NOT NULL,
  snapshot_id uuid REFERENCES public.workspace_snapshots(id) ON DELETE SET NULL,
  snapshot_name text,
  snapshot_timestamp timestamptz,
  restore_timestamp timestamptz,
  restore_mode text,
  restored_categories text[],
  restored_counts jsonb,
  performed_by uuid,
  performed_by_role text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.snapshot_audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own audit logs
CREATE POLICY "Users can read own snapshot audit logs"
  ON public.snapshot_audit_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Super admins can read all
CREATE POLICY "Super admins can read all snapshot audit logs"
  ON public.snapshot_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Insert allowed for authenticated (done via RPC security definer functions)
CREATE POLICY "Allow insert from security definer"
  ON public.snapshot_audit_logs FOR INSERT
  WITH CHECK (true);
