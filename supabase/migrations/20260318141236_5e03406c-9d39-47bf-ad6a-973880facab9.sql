
-- Requirement engine admin config (per-workspace)
CREATE TABLE public.requirement_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requirement_id text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL,
  label text NOT NULL,
  explanation text NOT NULL,
  depends_on text[] NOT NULL DEFAULT '{}',
  required boolean NOT NULL DEFAULT true,
  is_core boolean NOT NULL DEFAULT false,
  "group" text NOT NULL,
  check_key text NOT NULL,
  resolve text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, requirement_id)
);

ALTER TABLE public.requirement_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own requirement configs"
  ON public.requirement_configs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Version history for config changes
CREATE TABLE public.requirement_config_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  config_snapshot jsonb NOT NULL,
  change_description text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.requirement_config_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own config versions"
  ON public.requirement_config_versions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Guidance settings (per-workspace)
CREATE TABLE public.guidance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  sensitivity text NOT NULL DEFAULT 'balanced' CHECK (sensitivity IN ('aggressive', 'balanced', 'minimal')),
  enable_explanations boolean NOT NULL DEFAULT true,
  enable_idle_hints boolean NOT NULL DEFAULT true,
  enable_modal_simplification boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guidance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own guidance settings"
  ON public.guidance_settings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
