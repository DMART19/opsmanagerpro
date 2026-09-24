-- Create cache_inventory table for FEMA/Cache data structure
CREATE TABLE IF NOT EXISTS public.cache_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cache_fema TEXT,
  id_cache_tf TEXT,
  barcode TEXT,
  section TEXT,
  subcategory TEXT,
  description TEXT,
  manufacturer TEXT,
  model_part_num TEXT,
  serial_number TEXT,
  date_expire DATE,
  quantity_out INTEGER DEFAULT 0,
  quantity_available INTEGER DEFAULT 0,
  status_item TEXT,
  group_abbv TEXT,
  is_internal BOOLEAN DEFAULT false,
  group_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cache_inventory ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Cache inventory viewable by all authenticated users"
  ON public.cache_inventory
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff and above can manage cache inventory"
  ON public.cache_inventory
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'technician'::app_role) OR
    has_role(auth.uid(), 'staff'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'technician'::app_role) OR
    has_role(auth.uid(), 'staff'::app_role)
  );

-- Add trigger for updated_at
CREATE TRIGGER update_cache_inventory_updated_at
  BEFORE UPDATE ON public.cache_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for common queries
CREATE INDEX idx_cache_inventory_barcode ON public.cache_inventory(barcode);
CREATE INDEX idx_cache_inventory_section ON public.cache_inventory(section);
CREATE INDEX idx_cache_inventory_status ON public.cache_inventory(status_item);
CREATE INDEX idx_cache_inventory_date_expire ON public.cache_inventory(date_expire);
CREATE INDEX idx_cache_inventory_manufacturer ON public.cache_inventory(manufacturer);