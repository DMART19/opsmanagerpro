-- Create pallets table for warehouse inventory management
CREATE TABLE IF NOT EXISTS public.pallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.warehouse_sections(id) ON DELETE CASCADE,
  pallet_id TEXT NOT NULL,
  pallet_type TEXT DEFAULT 'Standard 48x40',
  max_capacity INTEGER DEFAULT 24,
  current_weight NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'available',
  condition TEXT DEFAULT 'good',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.pallets ENABLE ROW LEVEL SECURITY;

-- Pallets viewable by all authenticated users
CREATE POLICY "Pallets viewable by all authenticated users"
  ON public.pallets
  FOR SELECT
  USING (true);

-- Staff and above can manage pallets
CREATE POLICY "Staff and above can manage pallets"
  ON public.pallets
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

-- Trigger for updated_at
CREATE TRIGGER update_pallets_updated_at
  BEFORE UPDATE ON public.pallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_pallets_section_id ON public.pallets(section_id);

-- Link shipment_items to pallets (update existing table)
ALTER TABLE public.shipment_items 
  ADD COLUMN IF NOT EXISTS pallet_uuid UUID REFERENCES public.pallets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shipment_items_pallet_uuid ON public.shipment_items(pallet_uuid);