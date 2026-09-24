
-- Feature flags table (global definitions)
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  is_enabled boolean NOT NULL DEFAULT false,
  rollout_percentage integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Per-workspace overrides
CREATE TABLE public.workspace_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id uuid NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(flag_id, workspace_id)
);

-- RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_feature_flags ENABLE ROW LEVEL SECURITY;

-- Super admins can manage feature flags
CREATE POLICY "Super admins can manage feature flags"
  ON public.feature_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- All authenticated users can read feature flags (to check if feature is enabled)
CREATE POLICY "Authenticated users can read feature flags"
  ON public.feature_flags FOR SELECT TO authenticated
  USING (true);

-- Super admins can manage workspace overrides
CREATE POLICY "Super admins can manage workspace feature flags"
  ON public.workspace_feature_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Users can read their own workspace overrides
CREATE POLICY "Users can read own workspace feature flags"
  ON public.workspace_feature_flags FOR SELECT TO authenticated
  USING (true);

-- Helper function to check if a feature flag is enabled for a workspace
CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_flag_key text, p_workspace_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_global_enabled boolean;
  v_override_enabled boolean;
BEGIN
  -- Get global flag status
  SELECT is_enabled INTO v_global_enabled
  FROM public.feature_flags
  WHERE flag_key = p_flag_key;
  
  IF v_global_enabled IS NULL THEN
    RETURN false; -- Flag doesn't exist
  END IF;
  
  -- If no workspace specified, return global status
  IF p_workspace_id IS NULL THEN
    RETURN v_global_enabled;
  END IF;
  
  -- Check for workspace-level override
  SELECT wff.is_enabled INTO v_override_enabled
  FROM public.workspace_feature_flags wff
  JOIN public.feature_flags ff ON ff.id = wff.flag_id
  WHERE ff.flag_key = p_flag_key AND wff.workspace_id = p_workspace_id;
  
  -- If override exists, use it; otherwise use global
  RETURN COALESCE(v_override_enabled, v_global_enabled);
END;
$$;

-- Seed some example feature flags
INSERT INTO public.feature_flags (flag_key, name, description, category, is_enabled) VALUES
  ('beta_pallet_builder_v2', 'Pallet Builder V2', 'Next-generation pallet builder with 3D preview', 'beta', false),
  ('experimental_ai_categorization', 'AI Auto-Categorization', 'Automatically categorize assets using AI', 'experimental', false),
  ('admin_bulk_operations', 'Bulk Operations', 'Enable bulk edit/delete across inventory', 'admin', false),
  ('beta_mobile_scanner', 'Mobile Barcode Scanner', 'Native mobile barcode scanning integration', 'beta', false),
  ('experimental_predictive_restock', 'Predictive Restocking', 'AI-powered restock suggestions based on usage patterns', 'experimental', false);
