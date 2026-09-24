
-- Add deleted_by to all tables with soft-delete support
ALTER TABLE public.cache_inventory ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;
ALTER TABLE public.pallets ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;
ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Create trigger function to auto-set deleted_by on soft delete
CREATE OR REPLACE FUNCTION public.set_deleted_by()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Only fire when deleted_at is being set (was null, now not null)
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    NEW.deleted_by := auth.uid();
    
    -- Log to audit_logs
    INSERT INTO public.audit_logs (action, table_name, record_id, changed_by, old_data, new_data)
    VALUES (
      'soft_delete',
      TG_TABLE_NAME,
      NEW.id::text,
      auth.uid(),
      NULL,
      jsonb_build_object('deleted_at', NEW.deleted_at)
    );
  END IF;
  
  -- Clear deleted_by when restoring (deleted_at set back to null)
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    NEW.deleted_by := NULL;
    
    INSERT INTO public.audit_logs (action, table_name, record_id, changed_by, old_data, new_data)
    VALUES (
      'restore',
      TG_TABLE_NAME,
      NEW.id::text,
      auth.uid(),
      jsonb_build_object('deleted_at', OLD.deleted_at),
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Apply trigger to all soft-deletable tables
CREATE OR REPLACE TRIGGER trg_set_deleted_by_cache_inventory
  BEFORE UPDATE ON public.cache_inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_deleted_by();

CREATE OR REPLACE TRIGGER trg_set_deleted_by_employees
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_deleted_by();

CREATE OR REPLACE TRIGGER trg_set_deleted_by_tasks
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_deleted_by();

CREATE OR REPLACE TRIGGER trg_set_deleted_by_pallets
  BEFORE UPDATE ON public.pallets
  FOR EACH ROW EXECUTE FUNCTION public.set_deleted_by();

CREATE OR REPLACE TRIGGER trg_set_deleted_by_certifications
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.set_deleted_by();
