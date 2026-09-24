
-- Security definer function to look up an invite by token (safe for unauthenticated callers)
CREATE OR REPLACE FUNCTION public.lookup_workspace_invite(p_token TEXT)
  RETURNS TABLE(
    invite_id UUID,
    workspace_owner_id UUID,
    email TEXT,
    role TEXT,
    workspace_name TEXT
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT
    wi.id AS invite_id,
    wi.workspace_owner_id,
    wi.email,
    wi.role,
    COALESCE(ws.workspace_name, 'Workspace') AS workspace_name
  FROM public.workspace_invites wi
  LEFT JOIN public.workspace_settings ws ON ws.user_id = wi.workspace_owner_id
  WHERE wi.invite_token = p_token
    AND wi.status = 'pending'
  LIMIT 1;
$$;

-- Function to accept an invite (called after signup, runs as definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.accept_workspace_invite(p_token TEXT, p_user_id UUID)
  RETURNS TEXT
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Find the pending invite
  SELECT id, workspace_owner_id, email, role
  INTO v_invite
  FROM public.workspace_invites
  WHERE invite_token = p_token AND status = 'pending';

  IF v_invite IS NULL THEN
    RETURN 'invalid';
  END IF;

  -- Verify the user's email matches the invite
  IF lower(v_invite.email) != lower((SELECT email FROM auth.users WHERE id = p_user_id)) THEN
    RETURN 'email_mismatch';
  END IF;

  -- Create workspace membership
  INSERT INTO public.workspace_members (workspace_owner_id, user_id, role, status)
  VALUES (v_invite.workspace_owner_id, p_user_id, v_invite.role, 'active')
  ON CONFLICT DO NOTHING;

  -- Mark invite as accepted
  UPDATE public.workspace_invites
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_invite.id;

  RETURN 'accepted';
END;
$$;
