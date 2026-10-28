-- Phase 1: remove global feature-flag catalogue visibility and
-- prohibit cross-workspace lookups through SECURITY DEFINER RPC.
-- Existing super-admin FOR ALL policy remains authoritative.
BEGIN;
DROP POLICY IF EXISTS "Authenticated users can read feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Super admins can read feature flags" ON public.feature_flags;

CREATE OR REPLACE FUNCTION public.is_feature_enabled(
  p_flag_key text,
  p_workspace_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_global_enabled boolean;
  v_override_enabled boolean;
  v_caller uuid := auth.uid();
BEGIN
  -- Do not disclose internal flag configurations to anonymous callers.
  IF v_caller IS NULL THEN
    RETURN false;
  END IF;

  -- This function runs with definer privileges, so the workspace parameter
  -- must be authorized BEFORE looking up workspace-specific overrides.
  IF p_workspace_id IS NOT NULL
     AND NOT public.has_role(v_caller, 'super_admin'::public.app_role)
     AND p_workspace_id IS DISTINCT FROM public.get_effective_workspace_id()
  THEN
    RETURN false;
  END IF;

  SELECT is_enabled INTO v_global_enabled
    FROM public.feature_flags WHERE flag_key = p_flag_key;
  IF v_global_enabled IS NULL THEN RETURN false; END IF;
  IF p_workspace_id IS NULL THEN RETURN v_global_enabled; END IF;

  SELECT is_enabled INTO v_override_enabled
    FROM public.workspace_feature_flags wff
    JOIN public.feature_flags ff ON ff.id = wff.flag_id
   WHERE ff.flag_key = p_flag_key AND wff.workspace_id = p_workspace_id;

  RETURN COALESCE(v_override_enabled, v_global_enabled);
END;
$$;
COMMIT;
