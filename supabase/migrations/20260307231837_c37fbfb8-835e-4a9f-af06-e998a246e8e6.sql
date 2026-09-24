
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create workspace_members table with TEXT role (validated by trigger)
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_owner_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  invited_by UUID,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_owner_id, user_id)
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Validation trigger for role values
CREATE OR REPLACE FUNCTION public.validate_workspace_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role NOT IN ('viewer', 'inventory_clerk', 'safety_manager', 'supervisor', 'workspace_admin') THEN
    RAISE EXCEPTION 'Invalid workspace role: %', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_workspace_member_role
  BEFORE INSERT OR UPDATE ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_workspace_role();

-- Updated_at trigger
CREATE TRIGGER update_workspace_members_updated_at
  BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS policies
CREATE POLICY "Workspace owners can view their members"
  ON public.workspace_members FOR SELECT
  TO authenticated
  USING (workspace_owner_id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "Workspace owners can insert members"
  ON public.workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (workspace_owner_id = auth.uid());

CREATE POLICY "Workspace owners can update their members"
  ON public.workspace_members FOR UPDATE
  TO authenticated
  USING (workspace_owner_id = auth.uid());

CREATE POLICY "Workspace owners can delete their members"
  ON public.workspace_members FOR DELETE
  TO authenticated
  USING (workspace_owner_id = auth.uid());

-- Security definer function to get workspace role
CREATE OR REPLACE FUNCTION public.get_workspace_role(_user_id UUID, _workspace_owner_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id = _workspace_owner_id THEN 'workspace_admin'
    ELSE (
      SELECT role FROM public.workspace_members
      WHERE user_id = _user_id
        AND workspace_owner_id = _workspace_owner_id
        AND status = 'active'
    )
  END;
$$;
