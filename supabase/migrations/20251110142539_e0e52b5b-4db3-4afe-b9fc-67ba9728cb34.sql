-- Create warehouse_sections table
CREATE TABLE IF NOT EXISTS public.warehouse_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
  section_code TEXT NOT NULL,
  section_name TEXT NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 24,
  current_capacity INTEGER NOT NULL DEFAULT 0,
  location_description TEXT,
  floor_level INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(warehouse_id, section_code)
);

-- Create pallet_slots table
CREATE TABLE IF NOT EXISTS public.pallet_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.warehouse_sections(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL,
  slot_code TEXT NOT NULL,
  is_occupied BOOLEAN NOT NULL DEFAULT false,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  shipment_item_id UUID REFERENCES public.shipment_items(id) ON DELETE SET NULL,
  occupancy_status TEXT DEFAULT 'available' CHECK (occupancy_status IN ('available', 'occupied', 'reserved', 'maintenance')),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(section_id, slot_number)
);

-- Enable RLS
ALTER TABLE public.warehouse_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pallet_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for warehouse_sections
CREATE POLICY "Sections viewable by all authenticated users"
  ON public.warehouse_sections FOR SELECT
  USING (true);

CREATE POLICY "Managers and admins can manage sections"
  ON public.warehouse_sections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS Policies for pallet_slots
CREATE POLICY "Pallet slots viewable by all authenticated users"
  ON public.pallet_slots FOR SELECT
  USING (true);

CREATE POLICY "Staff and above can manage pallet slots"
  ON public.pallet_slots FOR ALL
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

-- Trigger to update warehouse_sections updated_at
CREATE TRIGGER update_warehouse_sections_updated_at
  BEFORE UPDATE ON public.warehouse_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update section capacity when pallet slots change
CREATE OR REPLACE FUNCTION update_section_capacity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.warehouse_sections
  SET current_capacity = (
    SELECT COUNT(*) 
    FROM public.pallet_slots 
    WHERE section_id = COALESCE(NEW.section_id, OLD.section_id) 
    AND is_occupied = true
  )
  WHERE id = COALESCE(NEW.section_id, OLD.section_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update section capacity
CREATE TRIGGER update_capacity_on_slot_change
  AFTER INSERT OR UPDATE OR DELETE ON public.pallet_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_section_capacity();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_sections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pallet_slots;