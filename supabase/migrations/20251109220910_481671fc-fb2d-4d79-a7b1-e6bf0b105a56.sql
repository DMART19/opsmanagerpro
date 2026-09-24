-- Create shipments table
CREATE TABLE public.shipments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_number text NOT NULL UNIQUE,
  destination text NOT NULL,
  origin_warehouse_id uuid REFERENCES public.warehouses(id),
  departure_date timestamp with time zone,
  arrival_date timestamp with time zone,
  carrier text,
  transport_type text,
  prepared_by uuid REFERENCES public.profiles(id),
  approved_by uuid REFERENCES public.profiles(id),
  notes text,
  special_instructions text,
  status text NOT NULL DEFAULT 'draft',
  verified_by uuid REFERENCES public.profiles(id),
  verified_at timestamp with time zone,
  received_by uuid REFERENCES public.profiles(id),
  received_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- Create shipment_items table
CREATE TABLE public.shipment_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  pallet_id text,
  case_id text,
  equipment_id uuid REFERENCES public.equipment(id),
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_weight numeric,
  total_weight numeric,
  dimensions_length numeric,
  dimensions_width numeric,
  dimensions_height numeric,
  volume numeric,
  condition text,
  notes text,
  barcode text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shipments
CREATE POLICY "Shipments viewable by all authenticated users"
  ON public.shipments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff and above can create shipments"
  ON public.shipments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'technician'::app_role) OR 
    has_role(auth.uid(), 'staff'::app_role)
  );

CREATE POLICY "Staff and above can update shipments"
  ON public.shipments
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'technician'::app_role) OR 
    has_role(auth.uid(), 'staff'::app_role)
  );

CREATE POLICY "Admins can delete shipments"
  ON public.shipments
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for shipment_items
CREATE POLICY "Shipment items viewable by all authenticated users"
  ON public.shipment_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff and above can manage shipment items"
  ON public.shipment_items
  FOR ALL
  TO authenticated
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

-- Create updated_at triggers
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipment_items_updated_at
  BEFORE UPDATE ON public.shipment_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_shipments_shipment_number ON public.shipments(shipment_number);
CREATE INDEX idx_shipments_status ON public.shipments(status);
CREATE INDEX idx_shipments_warehouse ON public.shipments(origin_warehouse_id);
CREATE INDEX idx_shipment_items_shipment ON public.shipment_items(shipment_id);
CREATE INDEX idx_shipment_items_pallet ON public.shipment_items(pallet_id);
CREATE INDEX idx_shipment_items_case ON public.shipment_items(case_id);