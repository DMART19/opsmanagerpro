
CREATE OR REPLACE FUNCTION public.handle_item_checkout()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- On INSERT (new checkout), decrease available and increase out
  IF TG_OP = 'INSERT' THEN
    -- Validate available quantity
    IF (SELECT COALESCE(quantity_available, 0) FROM public.cache_inventory WHERE id = NEW.item_id) < NEW.checked_out_quantity THEN
      RAISE EXCEPTION 'Not enough available quantity for checkout';
    END IF;
    
    -- Update quantities (removed status_item reference)
    UPDATE public.cache_inventory
    SET 
      quantity_available = COALESCE(quantity_available, 0) - NEW.checked_out_quantity,
      quantity_out = COALESCE(quantity_out, 0) + NEW.checked_out_quantity,
      updated_at = now()
    WHERE id = NEW.item_id;
    
    RETURN NEW;
  END IF;
  
  -- On UPDATE (check-in), restore quantities if being checked in
  IF TG_OP = 'UPDATE' THEN
    IF OLD.checked_in_at IS NULL AND NEW.checked_in_at IS NOT NULL THEN
      UPDATE public.cache_inventory
      SET 
        quantity_available = COALESCE(quantity_available, 0) + NEW.checked_out_quantity,
        quantity_out = GREATEST(COALESCE(quantity_out, 0) - NEW.checked_out_quantity, 0),
        updated_at = now()
      WHERE id = NEW.item_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$;
