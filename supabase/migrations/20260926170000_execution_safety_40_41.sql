-- Requirements 40-41: consequential-operation idempotency and execution authorization evidence.

CREATE TABLE IF NOT EXISTS public.consequential_operation_executions (
  idempotency_key text PRIMARY KEY,
  company_id uuid NOT NULL,
  provider text NOT NULL,
  capability text NOT NULL,
  operation text NOT NULL,
  state text NOT NULL DEFAULT 'claimed'
    CHECK (state IN ('claimed', 'dispatching', 'succeeded', 'ambiguous', 'failed')),
  provider_request_id text,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error text,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz,
  reconciled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consequential_operation_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read consequential executions"
  ON public.consequential_operation_executions;
CREATE POLICY "Super admins read consequential executions"
  ON public.consequential_operation_executions
  FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.claim_consequential_operation(
  p_idempotency_key text,
  p_company_id uuid,
  p_provider text,
  p_capability text,
  p_operation text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  INSERT INTO public.consequential_operation_executions (
    idempotency_key, company_id, provider, capability, operation
  )
  VALUES (
    p_idempotency_key, p_company_id, lower(p_provider), lower(p_capability), lower(p_operation)
  )
  ON CONFLICT (idempotency_key) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_consequential_operation_dispatching(
  p_idempotency_key text,
  p_provider_request_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.consequential_operation_executions
  SET state = 'dispatching',
      provider_request_id = p_provider_request_id,
      attempt_count = attempt_count + 1,
      dispatched_at = now(),
      updated_at = now()
  WHERE idempotency_key = p_idempotency_key
    AND state = 'claimed';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_consequential_operation_outcome(
  p_idempotency_key text,
  p_state text,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_state NOT IN ('succeeded', 'ambiguous', 'failed') THEN
    RAISE EXCEPTION 'invalid consequential operation state';
  END IF;

  UPDATE public.consequential_operation_executions
  SET state = p_state,
      last_error = left(p_error, 500),
      reconciled_at = CASE WHEN p_state IN ('succeeded', 'failed') THEN now() ELSE reconciled_at END,
      updated_at = now()
  WHERE idempotency_key = p_idempotency_key;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_consequential_operation(text, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_consequential_operation_dispatching(text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_consequential_operation_outcome(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_consequential_operation(text, uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_consequential_operation_dispatching(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_consequential_operation_outcome(text, text, text) TO service_role;

COMMENT ON TABLE public.consequential_operation_executions IS
  'Durable single-dispatch claim and ambiguous-outcome reconciliation ledger for consequential provider operations.';
