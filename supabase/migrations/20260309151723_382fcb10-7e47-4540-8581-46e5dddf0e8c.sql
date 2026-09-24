
-- Drop old function signatures
DROP FUNCTION IF EXISTS public.lookup_workspace_invite(text);

-- Recreate lookup to work with token OR short_code, and check expiry
CREATE FUNCTION public.lookup_workspace_invite(p_token text)
RETURNS TABLE(
  invite_id text,
  workspace_owner_id text,
  email text,
  role text,
  workspace_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wi.id::text AS invite_id,
    wi.workspace_owner_id::text,
    COALESCE(wi.email, '') AS email,
    wi.role,
    COALESCE(p.display_name, 'Workspace') AS workspace_name
  FROM workspace_invites wi
  LEFT JOIN profiles p ON p.id = wi.workspace_owner_id
  WHERE (wi.invite_token = p_token OR wi.short_code = upper(p_token))
    AND wi.status = 'pending'
    AND (wi.expires_at IS NULL OR wi.expires_at > now());
END;
$$;

-- Drop and recreate accept function
DROP FUNCTION IF EXISTS public.accept_workspace_invite(text, uuid);

CREATE FUNCTION public.accept_workspace_invite(p_token text, p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite workspace_invites%ROWTYPE;
  v_existing_member uuid;
  v_user_email text;
BEGIN
  SELECT * INTO v_invite
  FROM workspace_invites
  WHERE (invite_token = p_token OR short_code = upper(p_token))
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF v_invite.id IS NULL THEN
    RETURN 'invalid';
  END IF;

  IF v_invite.email IS NOT NULL AND v_invite.email != '' THEN
    SELECT u.email INTO v_user_email FROM auth.users u WHERE u.id = p_user_id;
    IF lower(v_user_email) != lower(v_invite.email) THEN
      RETURN 'email_mismatch';
    END IF;
  END IF;

  SELECT wm.id INTO v_existing_member
  FROM workspace_members wm
  WHERE wm.workspace_owner_id = v_invite.workspace_owner_id
    AND wm.user_id = p_user_id;

  IF v_existing_member IS NOT NULL THEN
    UPDATE workspace_members
    SET role = v_invite.role, status = 'active', accepted_at = now(), updated_at = now()
    WHERE id = v_existing_member;
  ELSE
    INSERT INTO workspace_members (workspace_owner_id, user_id, role, status, accepted_at, invited_by)
    VALUES (v_invite.workspace_owner_id, p_user_id, v_invite.role, 'active', now(), v_invite.workspace_owner_id);
  END IF;

  UPDATE workspace_invites
  SET status = 'accepted', accepted_at = now(), redeemed_by = p_user_id
  WHERE id = v_invite.id;

  RETURN 'ok';
END;
$$;
