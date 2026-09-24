-- Add custom_data JSONB column to cache_inventory for dynamic fields
ALTER TABLE public.cache_inventory 
ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- Add custom_data JSONB column to cache_boxes for dynamic fields
ALTER TABLE public.cache_boxes 
ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- Create index for better performance on custom_data queries
CREATE INDEX IF NOT EXISTS idx_cache_inventory_custom_data 
ON public.cache_inventory USING gin(custom_data);

CREATE INDEX IF NOT EXISTS idx_cache_boxes_custom_data 
ON public.cache_boxes USING gin(custom_data);

-- Update custom_fields table to track which fields are in custom_data vs real columns
ALTER TABLE public.custom_fields 
ADD COLUMN IF NOT EXISTS storage_type TEXT DEFAULT 'custom_data' CHECK (storage_type IN ('column', 'custom_data'));

COMMENT ON COLUMN public.custom_fields.storage_type IS 'Whether field is a real database column or stored in custom_data JSONB';