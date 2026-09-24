-- Add physical dimensions and pallet layout properties to cases table
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS length NUMERIC,
ADD COLUMN IF NOT EXISTS width NUMERIC,
ADD COLUMN IF NOT EXISTS height NUMERIC,
ADD COLUMN IF NOT EXISTS stackable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_stack_height NUMERIC,
ADD COLUMN IF NOT EXISTS allow_rotation BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS fragile BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contents TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.cases.length IS 'Case length in inches';
COMMENT ON COLUMN public.cases.width IS 'Case width in inches';
COMMENT ON COLUMN public.cases.height IS 'Case height in inches';
COMMENT ON COLUMN public.cases.stackable IS 'Whether case can be stacked';
COMMENT ON COLUMN public.cases.max_stack_height IS 'Maximum stack height in inches if stackable';
COMMENT ON COLUMN public.cases.allow_rotation IS 'Whether case can be rotated in pallet layout';
COMMENT ON COLUMN public.cases.fragile IS 'Whether case contains fragile items';
COMMENT ON COLUMN public.cases.contents IS 'Description of case contents';