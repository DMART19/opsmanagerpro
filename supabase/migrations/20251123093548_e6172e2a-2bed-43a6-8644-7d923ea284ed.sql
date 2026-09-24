-- Add sort_order and is_active to custom_fields
ALTER TABLE public.custom_fields
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_custom_fields_table_active 
ON public.custom_fields(table_name, is_active, sort_order);

-- Insert default fields for cache_boxes if they don't exist
INSERT INTO public.custom_fields (table_name, field_name, field_label, field_type, is_required, storage_type, sort_order, is_active, category)
VALUES 
  ('cache_boxes', 'box_number', 'Box Number', 'text', true, 'column', 1, true, 'core'),
  ('cache_boxes', 'cache_box_type', 'Box Type', 'text', true, 'column', 2, true, 'core'),
  ('cache_boxes', 'box_description', 'Description', 'text', false, 'column', 3, true, 'general'),
  ('cache_boxes', 'box_number_alt', 'Alternate Box Number', 'text', false, 'column', 4, true, 'general'),
  ('cache_boxes', 'barcode', 'Barcode', 'text', false, 'column', 5, true, 'general'),
  ('cache_boxes', 'status_cache_box', 'Status', 'select', false, 'column', 6, true, 'core'),
  ('cache_boxes', 'x_group_display', 'Group Display', 'text', false, 'column', 7, true, 'general')
ON CONFLICT DO NOTHING;

-- Insert default fields for cache_inventory if they don't exist
INSERT INTO public.custom_fields (table_name, field_name, field_label, field_type, is_required, storage_type, sort_order, is_active, category)
VALUES 
  ('cache_inventory', 'description', 'Description', 'text', true, 'column', 1, true, 'core'),
  ('cache_inventory', 'manufacturer', 'Manufacturer', 'text', false, 'column', 2, true, 'general'),
  ('cache_inventory', 'model_part_num', 'Model/Part Number', 'text', false, 'column', 3, true, 'general'),
  ('cache_inventory', 'serial_number', 'Serial Number', 'text', false, 'column', 4, true, 'general'),
  ('cache_inventory', 'barcode', 'Barcode', 'text', false, 'column', 5, true, 'general'),
  ('cache_inventory', 'quantity_available', 'Quantity Available', 'number', false, 'column', 6, true, 'inventory'),
  ('cache_inventory', 'quantity_out', 'Quantity Out', 'number', false, 'column', 7, true, 'inventory'),
  ('cache_inventory', 'section', 'Section', 'text', false, 'column', 8, true, 'location'),
  ('cache_inventory', 'subcategory', 'Subcategory', 'text', false, 'column', 9, true, 'general'),
  ('cache_inventory', 'status_item', 'Status', 'text', false, 'column', 10, true, 'core'),
  ('cache_inventory', 'date_expire', 'Expiration Date', 'date', false, 'column', 11, true, 'general'),
  ('cache_inventory', 'group_abbv', 'Group Abbreviation', 'text', false, 'column', 12, true, 'general'),
  ('cache_inventory', 'group_year', 'Group Year', 'number', false, 'column', 13, true, 'general'),
  ('cache_inventory', 'id_cache_fema', 'FEMA ID', 'text', false, 'column', 14, true, 'identifiers'),
  ('cache_inventory', 'id_cache_tf', 'TF ID', 'text', false, 'column', 15, true, 'identifiers'),
  ('cache_inventory', 'is_internal', 'Is Internal', 'boolean', false, 'column', 16, true, 'general')
ON CONFLICT DO NOTHING;

-- Create a function to reorder fields
CREATE OR REPLACE FUNCTION public.reorder_custom_fields(
  p_table_name TEXT,
  p_field_ids UUID[],
  p_new_orders INTEGER[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  FOR i IN 1..array_length(p_field_ids, 1) LOOP
    UPDATE public.custom_fields
    SET sort_order = p_new_orders[i],
        updated_at = now()
    WHERE id = p_field_ids[i] AND table_name = p_table_name;
  END LOOP;
END;
$$;

COMMENT ON TABLE public.custom_fields IS 'Dynamic field configuration - source of truth for all table schemas';
COMMENT ON COLUMN public.custom_fields.sort_order IS 'Display order in UI (lower = earlier)';
COMMENT ON COLUMN public.custom_fields.is_active IS 'Whether field is currently active/visible';
COMMENT ON COLUMN public.custom_fields.category IS 'Field grouping for organization (core, general, inventory, location, identifiers, etc.)';