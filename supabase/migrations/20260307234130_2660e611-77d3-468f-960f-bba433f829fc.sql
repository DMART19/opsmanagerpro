
-- Permission audit log table
CREATE TABLE public.permission_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_owner_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  target_user_id UUID NOT NULL,
  target_member_id UUID REFERENCES public.workspace_members(id) ON DELETE SET NULL,
  previous_role TEXT NOT NULL,
  new_role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_permission_audit_logs_workspace ON public.permission_audit_logs(workspace_owner_id, created_at DESC);

-- RLS
ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only workspace owner can read audit logs
CREATE POLICY "Workspace owner can read audit logs"
  ON public.permission_audit_logs FOR SELECT
  TO authenticated
  USING (workspace_owner_id = auth.uid());

-- Only workspace owner can insert audit logs
CREATE POLICY "Workspace owner can insert audit logs"
  ON public.permission_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (workspace_owner_id = auth.uid() AND changed_by = auth.uid());
