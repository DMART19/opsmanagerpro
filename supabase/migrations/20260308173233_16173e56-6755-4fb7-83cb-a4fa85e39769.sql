
CREATE OR REPLACE FUNCTION public.set_deleted_by()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    NEW.deleted_by := auth.uid();
    
    INSERT INTO public.audit_logs (action, table_name, record_id, changed_by, old_data, new_data)
    VALUES (
      'soft_delete',
      TG_TABLE_NAME,
      NEW.id,
      auth.uid(),
      NULL,
      jsonb_build_object('deleted_at', NEW.deleted_at)
    );
  END IF;
  
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    NEW.deleted_by := NULL;
    
    INSERT INTO public.audit_logs (action, table_name, record_id, changed_by, old_data, new_data)
    VALUES (
      'restore',
      TG_TABLE_NAME,
      NEW.id,
      auth.uid(),
      jsonb_build_object('deleted_at', OLD.deleted_at),
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
