
-- Workspace invites table
CREATE TABLE public.workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_owner_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  invite_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_workspace_invites_token ON public.workspace_invites(invite_token) WHERE status = 'pending';
CREATE INDEX idx_workspace_invites_owner ON public.workspace_invites(workspace_owner_id, created_at DESC);
CREATE INDEX idx_workspace_invites_email ON public.workspace_invites(email, status);

-- Validate role
CREATE OR REPLACE FUNCTION public.validate_invite_role()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role NOT IN ('viewer', 'inventory_clerk', 'safety_manager', 'supervisor', 'workspace_admin') THEN
    RAISE EXCEPTION 'Invalid workspace role: %', NEW.role;
  END IF;
  IF NEW.status NOT IN ('pending', 'accepted', 'revoked') THEN
    RAISE EXCEPTION 'Invalid invite status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_invite_role_trigger
  BEFORE INSERT OR UPDATE ON public.workspace_invites
  FOR EACH ROW EXECUTE FUNCTION public.validate_invite_role();

-- RLS
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Workspace owner can manage their invites
CREATE POLICY "Owner can manage invites"
  ON public.workspace_invites FOR ALL
  TO authenticated
  USING (workspace_owner_id = auth.uid())
  WITH CHECK (workspace_owner_id = auth.uid());

-- Anyone authenticated can read their own pending invite by token
CREATE POLICY "Users can read pending invites by email"
  ON public.workspace_invites FOR SELECT
  TO authenticated
  USING (status = 'pending' AND lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));
