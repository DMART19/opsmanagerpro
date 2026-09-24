-- Add container_id to cache_inventory to link items to containers
ALTER TABLE public.cache_inventory 
ADD COLUMN container_id UUID REFERENCES public.cache_boxes(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_cache_inventory_container_id ON public.cache_inventory(container_id);

-- Add item_count to cache_boxes for quick reference (will be computed)
ALTER TABLE public.cache_boxes
ADD COLUMN item_count INTEGER DEFAULT 0;