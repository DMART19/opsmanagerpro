-- Phase 1: server-enforced data classification and privileged execution controls.
-- Default is non-PHI. This migration does not inspect or infer PHI.

ALTER TABLE public.workspace_settings
  ADD COLUMN IF NOT EXISTS contains_phi boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.workspace_settings.contains_phi IS
  'When true, customer content may contain PHI. AI features must reject the workspace. Default false.';

-- Prevent ordinary authenticated clients from changing the control directly.
REVOKE UPDATE (contains_phi) ON public.workspace_settings FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_workspace_phi_mode(
  p_workspace_id uuid,
  p_contains_phi boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_workspace_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.workspace_settings
  SET contains_phi = p_contains_phi,
      updated_at = now()
  WHERE user_id = p_workspace_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_workspace_phi_mode(uuid, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_workspace_phi_mode(uuid, boolean)
  TO authenticated;

COMMENT ON FUNCTION public.set_workspace_phi_mode(uuid, boolean) IS
  'Owner-only server-side classification control. AI features must deny contains_phi workspaces.';
