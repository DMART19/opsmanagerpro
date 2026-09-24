-- Add quantity tracking fields to equipment table
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS total_quantity INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS available_quantity INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS checked_out_quantity INTEGER NOT NULL DEFAULT 0;

-- Add constraint to ensure quantities are valid
ALTER TABLE public.equipment
ADD CONSTRAINT valid_quantities CHECK (
  total_quantity >= 0 AND
  available_quantity >= 0 AND
  checked_out_quantity >= 0 AND
  available_quantity + checked_out_quantity = total_quantity
);

-- Add quantity field to equipment_checkouts
ALTER TABLE public.equipment_checkouts
ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

-- Create function to update equipment quantities on checkout
CREATE OR REPLACE FUNCTION public.update_equipment_quantities_on_checkout()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Validate available quantity
    IF (SELECT available_quantity FROM public.equipment WHERE id = NEW.equipment_id) < NEW.quantity THEN
      RAISE EXCEPTION 'Not enough available stock to complete checkout.';
    END IF;
    
    -- Update quantities
    UPDATE public.equipment
    SET 
      available_quantity = available_quantity - NEW.quantity,
      checked_out_quantity = checked_out_quantity + NEW.quantity,
      status = CASE 
        WHEN available_quantity - NEW.quantity = 0 THEN 'checked_out'
        ELSE 'in_use'
      END
    WHERE id = NEW.equipment_id;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'returned' THEN
    -- On return, restore quantities
    UPDATE public.equipment
    SET 
      available_quantity = available_quantity + OLD.quantity,
      checked_out_quantity = checked_out_quantity - OLD.quantity,
      status = CASE 
        WHEN available_quantity + OLD.quantity = total_quantity THEN 'available'
        ELSE 'in_use'
      END
    WHERE id = OLD.equipment_id;
    
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    -- If deleting an active checkout, restore quantities
    UPDATE public.equipment
    SET 
      available_quantity = available_quantity + OLD.quantity,
      checked_out_quantity = checked_out_quantity - OLD.quantity,
      status = CASE 
        WHEN available_quantity + OLD.quantity = total_quantity THEN 'available'
        ELSE 'in_use'
      END
    WHERE id = OLD.equipment_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for quantity updates
DROP TRIGGER IF EXISTS equipment_checkout_quantities ON public.equipment_checkouts;
CREATE TRIGGER equipment_checkout_quantities
  AFTER INSERT OR UPDATE OR DELETE ON public.equipment_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_equipment_quantities_on_checkout();

-- Create function to prevent deleting team members with active checkouts
CREATE OR REPLACE FUNCTION public.prevent_delete_with_active_checkouts()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.equipment_checkouts 
    WHERE staff_id = OLD.id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Cannot delete team member with active checkouts. Return all items first.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to prevent deleting staff with active checkouts
DROP TRIGGER IF EXISTS prevent_staff_delete_with_checkouts ON public.staff;
CREATE TRIGGER prevent_staff_delete_with_checkouts
  BEFORE DELETE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_delete_with_active_checkouts();