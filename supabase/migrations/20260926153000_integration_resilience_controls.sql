-- Requirements 38-39: integration kill switches and provider outage circuit breakers.
-- These controls are intentionally provider-agnostic. New providers become protected by
-- using the server-side dispatch wrapper in supabase/functions/_shared/integration-resilience.ts.

CREATE TABLE IF NOT EXISTS public.integration_kill_switches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('all', 'provider', 'company', 'capability', 'operation')),
  provider text,
  company_id uuid,
  capability text,
  operation text,
  enabled boolean NOT NULL DEFAULT true,
  reason text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_kill_switch_scope_shape CHECK (
    (scope = 'all' AND provider IS NULL AND company_id IS NULL AND capability IS NULL AND operation IS NULL)
    OR (scope = 'provider' AND provider IS NOT NULL AND company_id IS NULL AND capability IS NULL AND operation IS NULL)
    OR (scope = 'company' AND provider IS NULL AND company_id IS NOT NULL AND capability IS NULL AND operation IS NULL)
    OR (scope = 'capability' AND provider IS NULL AND company_id IS NULL AND capability IS NOT NULL AND operation IS NULL)
    OR (scope = 'operation' AND provider IS NOT NULL AND company_id IS NULL AND capability IS NULL AND operation IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS integration_kill_switches_active_scope_idx
  ON public.integration_kill_switches (enabled, scope);
CREATE INDEX IF NOT EXISTS integration_kill_switches_provider_idx
  ON public.integration_kill_switches (provider) WHERE enabled;
CREATE INDEX IF NOT EXISTS integration_kill_switches_company_idx
  ON public.integration_kill_switches (company_id) WHERE enabled;
CREATE INDEX IF NOT EXISTS integration_kill_switches_capability_idx
  ON public.integration_kill_switches (capability) WHERE enabled;
CREATE INDEX IF NOT EXISTS integration_kill_switches_operation_idx
  ON public.integration_kill_switches (provider, operation) WHERE enabled;

ALTER TABLE public.integration_kill_switches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage integration kill switches" ON public.integration_kill_switches;
CREATE POLICY "Super admins manage integration kill switches"
  ON public.integration_kill_switches
  FOR ALL
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'super_admin'::app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.integration_provider_circuits (
  provider text NOT NULL,
  circuit_key text NOT NULL DEFAULT 'global',
  state text NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half_open')),
  consecutive_failures integer NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  failure_threshold integer NOT NULL DEFAULT 5 CHECK (failure_threshold BETWEEN 1 AND 100),
  open_count integer NOT NULL DEFAULT 0 CHECK (open_count >= 0),
  base_cooldown_seconds integer NOT NULL DEFAULT 60 CHECK (base_cooldown_seconds BETWEEN 5 AND 86400),
  max_cooldown_seconds integer NOT NULL DEFAULT 1800 CHECK (max_cooldown_seconds BETWEEN 5 AND 86400),
  open_until timestamptz,
  half_open_claimed_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, circuit_key)
);

ALTER TABLE public.integration_provider_circuits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage integration provider circuits" ON public.integration_provider_circuits;
CREATE POLICY "Super admins manage integration provider circuits"
  ON public.integration_provider_circuits
  FOR ALL
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'super_admin'::app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'super_admin'::app_role));

-- Seed the provider families required by the control plane. Future providers are inserted
-- lazily by integration_pre_dispatch_guard the first time they are used.
INSERT INTO public.integration_provider_circuits (provider, circuit_key)
VALUES
  ('gmail', 'global'),
  ('slack', 'global'),
  ('openrouter', 'global'),
  ('https', 'global')
ON CONFLICT (provider, circuit_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.integration_pre_dispatch_guard(
  p_company_id uuid,
  p_provider text,
  p_capability text,
  p_operation text,
  p_circuit_key text DEFAULT 'global'
)
RETURNS TABLE (
  allowed boolean,
  reason text,
  kill_switch_id uuid,
  circuit_state text,
  retry_after_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider text := lower(trim(p_provider));
  v_capability text := lower(trim(p_capability));
  v_operation text := lower(trim(p_operation));
  v_circuit_key text := lower(trim(COALESCE(NULLIF(p_circuit_key, ''), 'global')));
  v_switch public.integration_kill_switches%ROWTYPE;
  v_circuit public.integration_provider_circuits%ROWTYPE;
  v_retry integer := 0;
BEGIN
  IF v_provider = '' OR v_capability = '' OR v_operation = '' THEN
    RAISE EXCEPTION 'provider, capability and operation are required';
  END IF;

  -- Requirement 38: this lookup happens at dispatch time, never from a cached snapshot.
  SELECT ks.*
  INTO v_switch
  FROM public.integration_kill_switches ks
  WHERE ks.enabled = true
    AND (
      ks.scope = 'all'
      OR (ks.scope = 'provider' AND lower(ks.provider) = v_provider)
      OR (ks.scope = 'company' AND ks.company_id = p_company_id)
      OR (ks.scope = 'capability' AND lower(ks.capability) = v_capability)
      OR (ks.scope = 'operation' AND lower(ks.provider) = v_provider AND lower(ks.operation) = v_operation)
    )
  ORDER BY CASE ks.scope
    WHEN 'operation' THEN 5
    WHEN 'capability' THEN 4
    WHEN 'company' THEN 3
    WHEN 'provider' THEN 2
    ELSE 1
  END DESC, ks.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT false, 'kill_switch'::text, v_switch.id, 'not_checked'::text, 0;
    RETURN;
  END IF;

  INSERT INTO public.integration_provider_circuits (provider, circuit_key)
  VALUES (v_provider, v_circuit_key)
  ON CONFLICT (provider, circuit_key) DO NOTHING;

  -- Serialize state transitions so only one half-open probe is released after cooldown.
  SELECT c.*
  INTO v_circuit
  FROM public.integration_provider_circuits c
  WHERE c.provider = v_provider
    AND c.circuit_key = v_circuit_key
  FOR UPDATE;

  IF v_circuit.state = 'open' THEN
    IF v_circuit.open_until IS NOT NULL AND v_circuit.open_until > now() THEN
      v_retry := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_circuit.open_until - now())))::integer);
      RETURN QUERY SELECT false, 'circuit_open'::text, NULL::uuid, 'open'::text, v_retry;
      RETURN;
    END IF;

    UPDATE public.integration_provider_circuits
    SET state = 'half_open',
        half_open_claimed_at = now(),
        updated_at = now()
    WHERE provider = v_provider AND circuit_key = v_circuit_key;

    RETURN QUERY SELECT true, 'half_open_probe'::text, NULL::uuid, 'half_open'::text, 0;
    RETURN;
  END IF;

  IF v_circuit.state = 'half_open' THEN
    -- A crashed worker cannot strand the circuit forever; its probe lease expires.
    IF v_circuit.half_open_claimed_at IS NULL
       OR v_circuit.half_open_claimed_at < now() - interval '60 seconds' THEN
      UPDATE public.integration_provider_circuits
      SET half_open_claimed_at = now(),
          updated_at = now()
      WHERE provider = v_provider AND circuit_key = v_circuit_key;

      RETURN QUERY SELECT true, 'half_open_recovery_probe'::text, NULL::uuid, 'half_open'::text, 0;
      RETURN;
    END IF;

    v_retry := GREATEST(
      1,
      60 - FLOOR(EXTRACT(EPOCH FROM (now() - v_circuit.half_open_claimed_at)))::integer
    );
    RETURN QUERY SELECT false, 'circuit_half_open'::text, NULL::uuid, 'half_open'::text, v_retry;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'allowed'::text, NULL::uuid, 'closed'::text, 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.integration_record_provider_success(
  p_provider text,
  p_circuit_key text DEFAULT 'global'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider text := lower(trim(p_provider));
  v_circuit_key text := lower(trim(COALESCE(NULLIF(p_circuit_key, ''), 'global')));
BEGIN
  INSERT INTO public.integration_provider_circuits (
    provider, circuit_key, state, consecutive_failures, open_count,
    open_until, half_open_claimed_at, last_success_at, updated_at
  )
  VALUES (
    v_provider, v_circuit_key, 'closed', 0, 0,
    NULL, NULL, now(), now()
  )
  ON CONFLICT (provider, circuit_key) DO UPDATE
  SET state = 'closed',
      consecutive_failures = 0,
      open_count = 0,
      open_until = NULL,
      half_open_claimed_at = NULL,
      last_success_at = now(),
      last_error_code = NULL,
      updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.integration_record_provider_failure(
  p_provider text,
  p_circuit_key text DEFAULT 'global',
  p_error_code text DEFAULT NULL
)
RETURNS TABLE (
  circuit_state text,
  retry_after_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider text := lower(trim(p_provider));
  v_circuit_key text := lower(trim(COALESCE(NULLIF(p_circuit_key, ''), 'global')));
  v_circuit public.integration_provider_circuits%ROWTYPE;
  v_failures integer;
  v_open_count integer;
  v_cooldown integer;
BEGIN
  INSERT INTO public.integration_provider_circuits (provider, circuit_key)
  VALUES (v_provider, v_circuit_key)
  ON CONFLICT (provider, circuit_key) DO NOTHING;

  SELECT c.*
  INTO v_circuit
  FROM public.integration_provider_circuits c
  WHERE c.provider = v_provider AND c.circuit_key = v_circuit_key
  FOR UPDATE;

  v_failures := v_circuit.consecutive_failures + 1;

  IF v_circuit.state = 'half_open' OR v_failures >= v_circuit.failure_threshold THEN
    v_open_count := v_circuit.open_count + 1;
    v_cooldown := LEAST(
      v_circuit.max_cooldown_seconds,
      v_circuit.base_cooldown_seconds * power(2, LEAST(v_open_count - 1, 8))::integer
    );

    UPDATE public.integration_provider_circuits
    SET state = 'open',
        consecutive_failures = v_failures,
        open_count = v_open_count,
        open_until = now() + make_interval(secs => v_cooldown),
        half_open_claimed_at = NULL,
        last_failure_at = now(),
        last_error_code = left(p_error_code, 120),
        updated_at = now()
    WHERE provider = v_provider AND circuit_key = v_circuit_key;

    RETURN QUERY SELECT 'open'::text, v_cooldown;
    RETURN;
  END IF;

  UPDATE public.integration_provider_circuits
  SET consecutive_failures = v_failures,
      last_failure_at = now(),
      last_error_code = left(p_error_code, 120),
      updated_at = now()
  WHERE provider = v_provider AND circuit_key = v_circuit_key;

  RETURN QUERY SELECT 'closed'::text, 0;
END;
$$;

REVOKE ALL ON FUNCTION public.integration_pre_dispatch_guard(uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.integration_record_provider_success(text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.integration_record_provider_failure(text, text, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.integration_pre_dispatch_guard(uuid, text, text, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.integration_record_provider_success(text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.integration_record_provider_failure(text, text, text)
  TO service_role;

COMMENT ON FUNCTION public.integration_pre_dispatch_guard(uuid, text, text, text, text) IS
  'Authoritative last-moment integration dispatch guard. Checks current kill switches and atomically claims circuit-breaker half-open probes.';
