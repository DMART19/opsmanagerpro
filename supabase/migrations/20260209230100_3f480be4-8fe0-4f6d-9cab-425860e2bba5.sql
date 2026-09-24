
-- Add is_template flag to saved_pallet_builds
ALTER TABLE public.saved_pallet_builds
ADD COLUMN is_template boolean NOT NULL DEFAULT false;

-- Add index for efficient template filtering
CREATE INDEX idx_saved_pallet_builds_is_template ON public.saved_pallet_builds(is_template) WHERE is_template = true;
