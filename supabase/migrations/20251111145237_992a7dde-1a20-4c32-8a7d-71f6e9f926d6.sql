-- Create cases table for pallet organization
CREATE TABLE IF NOT EXISTS public.cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pallet_id UUID NOT NULL REFERENCES public.pallets(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL,
  case_type TEXT DEFAULT 'Standard',
  weight NUMERIC DEFAULT 0,
  condition TEXT DEFAULT 'good',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create items table for inventory items
CREATE TABLE IF NOT EXISTS public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.warehouse_sections(id) ON DELETE CASCADE,
  pallet_id UUID REFERENCES public.pallets(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_weight NUMERIC DEFAULT 0,
  total_weight NUMERIC DEFAULT 0,
  condition TEXT DEFAULT 'good',
  custodian TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT item_parent_check CHECK (
    (pallet_id IS NOT NULL AND case_id IS NULL) OR
    (pallet_id IS NULL AND case_id IS NOT NULL) OR
    (pallet_id IS NOT NULL AND case_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Cases viewable by all authenticated users
CREATE POLICY "Cases viewable by all authenticated users"
  ON public.cases
  FOR SELECT
  USING (true);

-- Staff and above can manage cases
CREATE POLICY "Staff and above can manage cases"
  ON public.cases
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

-- Items viewable by all authenticated users
CREATE POLICY "Items viewable by all authenticated users"
  ON public.items
  FOR SELECT
  USING (true);

-- Staff and above can manage items
CREATE POLICY "Staff and above can manage items"
  ON public.items
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

-- Triggers for updated_at
CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_cases_pallet_id ON public.cases(pallet_id);
CREATE INDEX idx_items_section_id ON public.items(section_id);
CREATE INDEX idx_items_pallet_id ON public.items(pallet_id);
CREATE INDEX idx_items_case_id ON public.items(case_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;