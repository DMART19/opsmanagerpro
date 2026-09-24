-- Fix the foreign key constraint to cascade deletes
-- Drop existing constraint and recreate with ON DELETE CASCADE

ALTER TABLE public.item_checkouts
  DROP CONSTRAINT IF EXISTS item_checkouts_employee_id_fkey;

ALTER TABLE public.item_checkouts
  ADD CONSTRAINT item_checkouts_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;