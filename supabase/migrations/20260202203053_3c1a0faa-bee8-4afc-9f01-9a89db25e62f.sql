-- Add stock alert threshold columns to cache_inventory
ALTER TABLE public.cache_inventory 
ADD COLUMN low_stock_threshold integer DEFAULT 5,
ADD COLUMN critical_stock_threshold integer DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.cache_inventory.low_stock_threshold IS 'Quantity threshold for low stock warning alerts';
COMMENT ON COLUMN public.cache_inventory.critical_stock_threshold IS 'Quantity threshold for critical/out of stock alerts';