-- Add server-side input validation constraints to prevent malicious data insertion
-- This addresses the INPUT_VALIDATION security finding

-- Add length constraints to items table
ALTER TABLE public.items 
ADD CONSTRAINT item_name_length CHECK (length(item_name) <= 200),
ADD CONSTRAINT item_id_length CHECK (length(item_id) <= 100),
ADD CONSTRAINT items_notes_length CHECK (notes IS NULL OR length(notes) <= 2000),
ADD CONSTRAINT custodian_length CHECK (custodian IS NULL OR length(custodian) <= 200);

-- Add length constraints to cases table
ALTER TABLE public.cases 
ADD CONSTRAINT case_id_length CHECK (length(case_id) <= 100),
ADD CONSTRAINT case_type_length CHECK (case_type IS NULL OR length(case_type) <= 100),
ADD CONSTRAINT cases_notes_length CHECK (notes IS NULL OR length(notes) <= 2000);

-- Add length constraints to pallets table
ALTER TABLE public.pallets 
ADD CONSTRAINT pallet_id_length CHECK (length(pallet_id) <= 100),
ADD CONSTRAINT pallet_type_length CHECK (pallet_type IS NULL OR length(pallet_type) <= 100),
ADD CONSTRAINT pallets_notes_length CHECK (notes IS NULL OR length(notes) <= 2000);

-- Add length constraints to equipment table
ALTER TABLE public.equipment 
ADD CONSTRAINT asset_tag_length CHECK (length(asset_tag) <= 100),
ADD CONSTRAINT equipment_name_length CHECK (length(name) <= 200),
ADD CONSTRAINT serial_number_length CHECK (serial_number IS NULL OR length(serial_number) <= 100),
ADD CONSTRAINT equipment_notes_length CHECK (notes IS NULL OR length(notes) <= 2000);

-- Add length constraints to staff table
ALTER TABLE public.staff 
ADD CONSTRAINT employee_id_length CHECK (employee_id IS NULL OR length(employee_id) <= 50),
ADD CONSTRAINT staff_email_length CHECK (length(email) <= 255),
ADD CONSTRAINT staff_notes_length CHECK (notes IS NULL OR length(notes) <= 2000);

-- Add length constraints to shipments table
ALTER TABLE public.shipments 
ADD CONSTRAINT shipment_number_length CHECK (length(shipment_number) <= 100),
ADD CONSTRAINT destination_length CHECK (length(destination) <= 500),
ADD CONSTRAINT shipments_notes_length CHECK (notes IS NULL OR length(notes) <= 2000),
ADD CONSTRAINT special_instructions_length CHECK (special_instructions IS NULL OR length(special_instructions) <= 2000);

-- Add input validation function for alphanumeric IDs
CREATE OR REPLACE FUNCTION public.validate_alphanumeric_id(id_value text, field_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF id_value !~ '^[A-Za-z0-9\-_. ]+$' THEN
    RAISE EXCEPTION 'Invalid characters in %: only letters, numbers, hyphens, underscores, dots and spaces are allowed', field_name;
  END IF;
  RETURN true;
END;
$$;

-- Create validation triggers for items
CREATE OR REPLACE FUNCTION public.validate_item_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM validate_alphanumeric_id(NEW.item_id, 'item_id');
  
  -- Prevent excessively long quantities
  IF NEW.quantity < 0 OR NEW.quantity > 999999 THEN
    RAISE EXCEPTION 'Quantity must be between 0 and 999999';
  END IF;
  
  -- Validate weight values
  IF NEW.unit_weight < 0 OR NEW.total_weight < 0 THEN
    RAISE EXCEPTION 'Weight values cannot be negative';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER items_validation_trigger
BEFORE INSERT OR UPDATE ON public.items
FOR EACH ROW
EXECUTE FUNCTION validate_item_input();

-- Create validation trigger for cases
CREATE OR REPLACE FUNCTION public.validate_case_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM validate_alphanumeric_id(NEW.case_id, 'case_id');
  
  IF NEW.weight < 0 THEN
    RAISE EXCEPTION 'Weight cannot be negative';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER cases_validation_trigger
BEFORE INSERT OR UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION validate_case_input();

-- Create validation trigger for pallets
CREATE OR REPLACE FUNCTION public.validate_pallet_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM validate_alphanumeric_id(NEW.pallet_id, 'pallet_id');
  
  IF NEW.current_weight < 0 THEN
    RAISE EXCEPTION 'Current weight cannot be negative';
  END IF;
  
  IF NEW.max_capacity <= 0 THEN
    RAISE EXCEPTION 'Max capacity must be greater than 0';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER pallets_validation_trigger
BEFORE INSERT OR UPDATE ON public.pallets
FOR EACH ROW
EXECUTE FUNCTION validate_pallet_input();