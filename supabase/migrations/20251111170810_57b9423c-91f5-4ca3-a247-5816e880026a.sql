-- Fix search_path security issues for validation functions
-- This addresses the function search path mutable linter warnings

-- Update validate_alphanumeric_id function with fixed search_path
CREATE OR REPLACE FUNCTION public.validate_alphanumeric_id(id_value text, field_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF id_value !~ '^[A-Za-z0-9\-_. ]+$' THEN
    RAISE EXCEPTION 'Invalid characters in %: only letters, numbers, hyphens, underscores, dots and spaces are allowed', field_name;
  END IF;
  RETURN true;
END;
$$;

-- Update validate_item_input function with fixed search_path
CREATE OR REPLACE FUNCTION public.validate_item_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM validate_alphanumeric_id(NEW.item_id, 'item_id');
  
  IF NEW.quantity < 0 OR NEW.quantity > 999999 THEN
    RAISE EXCEPTION 'Quantity must be between 0 and 999999';
  END IF;
  
  IF NEW.unit_weight < 0 OR NEW.total_weight < 0 THEN
    RAISE EXCEPTION 'Weight values cannot be negative';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update validate_case_input function with fixed search_path
CREATE OR REPLACE FUNCTION public.validate_case_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM validate_alphanumeric_id(NEW.case_id, 'case_id');
  
  IF NEW.weight < 0 THEN
    RAISE EXCEPTION 'Weight cannot be negative';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update validate_pallet_input function with fixed search_path
CREATE OR REPLACE FUNCTION public.validate_pallet_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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