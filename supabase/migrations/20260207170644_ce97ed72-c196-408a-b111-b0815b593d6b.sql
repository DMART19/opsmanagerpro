-- Create item_checkouts table for tracking cache_inventory checkouts to team members
CREATE TABLE public.item_checkouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.cache_inventory(id) ON DELETE RESTRICT,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  checked_out_quantity INTEGER NOT NULL DEFAULT 1,
  checked_out_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  checked_out_by UUID NOT NULL,
  expected_return_at TIMESTAMP WITH TIME ZONE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by UUID,
  checkout_notes TEXT,
  checkin_notes TEXT,
  return_condition TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.item_checkouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own item checkouts"
ON public.item_checkouts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cache_inventory ci
    WHERE ci.id = item_id AND ci.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create item checkouts for their items"
ON public.item_checkouts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cache_inventory ci
    WHERE ci.id = item_id AND ci.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own item checkouts"
ON public.item_checkouts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.cache_inventory ci
    WHERE ci.id = item_id AND ci.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own item checkouts"
ON public.item_checkouts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.cache_inventory ci
    WHERE ci.id = item_id AND ci.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_item_checkouts_item_id ON public.item_checkouts(item_id);
CREATE INDEX idx_item_checkouts_employee_id ON public.item_checkouts(employee_id);
CREATE INDEX idx_item_checkouts_active ON public.item_checkouts(item_id) WHERE checked_in_at IS NULL;

-- Function to update item quantities on checkout
CREATE OR REPLACE FUNCTION public.handle_item_checkout()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT (new checkout), decrease available and increase out
  IF TG_OP = 'INSERT' THEN
    -- Validate available quantity
    IF (SELECT COALESCE(quantity_available, 0) FROM public.cache_inventory WHERE id = NEW.item_id) < NEW.checked_out_quantity THEN
      RAISE EXCEPTION 'Not enough available quantity for checkout';
    END IF;
    
    -- Update quantities
    UPDATE public.cache_inventory
    SET 
      quantity_available = COALESCE(quantity_available, 0) - NEW.checked_out_quantity,
      quantity_out = COALESCE(quantity_out, 0) + NEW.checked_out_quantity,
      status_item = CASE 
        WHEN COALESCE(quantity_available, 0) - NEW.checked_out_quantity = 0 THEN 'in_use'
        ELSE 'available'
      END,
      updated_at = now()
    WHERE id = NEW.item_id;
    
    RETURN NEW;
  END IF;
  
  -- On UPDATE (check-in), restore quantities if being checked in
  IF TG_OP = 'UPDATE' THEN
    -- Only process if this is a check-in (checked_in_at was NULL and now has value)
    IF OLD.checked_in_at IS NULL AND NEW.checked_in_at IS NOT NULL THEN
      UPDATE public.cache_inventory
      SET 
        quantity_available = COALESCE(quantity_available, 0) + NEW.checked_out_quantity,
        quantity_out = GREATEST(COALESCE(quantity_out, 0) - NEW.checked_out_quantity, 0),
        status_item = 'available',
        updated_at = now()
      WHERE id = NEW.item_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
CREATE TRIGGER on_item_checkout
  AFTER INSERT ON public.item_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_item_checkout();

CREATE TRIGGER on_item_checkin
  AFTER UPDATE ON public.item_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_item_checkout();

-- Add trigger to prevent deleting items with active checkouts
CREATE OR REPLACE FUNCTION public.prevent_item_delete_with_checkouts()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.item_checkouts 
    WHERE item_id = OLD.id AND checked_in_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot delete item with active checkouts. Please check in all items first.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER prevent_delete_item_with_checkouts
  BEFORE DELETE ON public.cache_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_item_delete_with_checkouts();

-- Add trigger to prevent deleting employees with active checkouts
CREATE OR REPLACE FUNCTION public.prevent_employee_delete_with_item_checkouts()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.item_checkouts 
    WHERE employee_id = OLD.id AND checked_in_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot delete team member with active item checkouts. Please check in all items first.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER prevent_delete_employee_with_item_checkouts
  BEFORE DELETE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_employee_delete_with_item_checkouts();

-- Add updated_at trigger
CREATE TRIGGER update_item_checkouts_updated_at
  BEFORE UPDATE ON public.item_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for item_checkouts
ALTER PUBLICATION supabase_realtime ADD TABLE public.item_checkouts;