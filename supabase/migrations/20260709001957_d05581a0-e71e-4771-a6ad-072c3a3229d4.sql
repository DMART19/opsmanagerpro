-- 1. Tighten warehouse_placements RLS: drop the auth-only write policies.
DROP POLICY IF EXISTS "Authenticated users can create placements" ON public.warehouse_placements;
DROP POLICY IF EXISTS "Authenticated users can update placements" ON public.warehouse_placements;
DROP POLICY IF EXISTS "Authenticated users can delete placements" ON public.warehouse_placements;
-- Keep the SELECT-for-authenticated and the manager/admin ALL policy.

-- 2. Audit trigger function for warehouse mutations.
CREATE OR REPLACE FUNCTION public.audit_warehouse_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_record_id uuid;
  v_workspace uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'INSERT';
    v_record_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_record_id := NEW.id;
  ELSE
    v_action := 'DELETE';
    v_record_id := OLD.id;
  END IF;

  -- Best-effort workspace resolution via the linked warehouse row.
  BEGIN
    SELECT w.workspace_id
      INTO v_workspace
      FROM public.warehouses w
     WHERE w.id = COALESCE(NEW.warehouse_id, OLD.warehouse_id);
  EXCEPTION WHEN OTHERS THEN
    v_workspace := NULL;
  END;

  INSERT INTO public.audit_logs (
    table_name, record_id, action, old_data, new_data, changed_by, workspace_id
  ) VALUES (
    TG_TABLE_NAME,
    v_record_id,
    v_action,
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END,
    auth.uid(),
    v_workspace
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. Attach triggers (idempotent).
DROP TRIGGER IF EXISTS trg_audit_warehouse_placements ON public.warehouse_placements;
CREATE TRIGGER trg_audit_warehouse_placements
AFTER INSERT OR UPDATE OR DELETE ON public.warehouse_placements
FOR EACH ROW EXECUTE FUNCTION public.audit_warehouse_change();

DROP TRIGGER IF EXISTS trg_audit_warehouse_twin_objects ON public.warehouse_twin_objects;
CREATE TRIGGER trg_audit_warehouse_twin_objects
AFTER INSERT OR UPDATE OR DELETE ON public.warehouse_twin_objects
FOR EACH ROW EXECUTE FUNCTION public.audit_warehouse_change();

-- 4. Allow the trigger's inserts (SECURITY DEFINER already bypasses RLS on
-- audit_logs, but be explicit for future policy changes).
GRANT INSERT ON public.audit_logs TO authenticated;