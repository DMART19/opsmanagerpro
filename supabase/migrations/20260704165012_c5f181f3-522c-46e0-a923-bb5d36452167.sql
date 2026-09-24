
-- 1) Placements table: join between a twin object and a real inventory item or pallet.
CREATE TABLE public.warehouse_placements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id  uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  twin_object_id uuid NOT NULL REFERENCES public.warehouse_twin_objects(id) ON DELETE CASCADE,
  ref_type      text NOT NULL CHECK (ref_type IN ('inventory','pallet')),
  ref_id        uuid NOT NULL,
  qty           integer NOT NULL DEFAULT 1 CHECK (qty >= 0),
  notes         text,
  location_code text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid
);

CREATE INDEX idx_placements_warehouse ON public.warehouse_placements(warehouse_id);
CREATE INDEX idx_placements_twin ON public.warehouse_placements(twin_object_id);
CREATE INDEX idx_placements_ref ON public.warehouse_placements(ref_type, ref_id);
CREATE UNIQUE INDEX uniq_pallet_placement
  ON public.warehouse_placements(warehouse_id, ref_id)
  WHERE ref_type = 'pallet';

-- 2) GRANTs (Data API access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouse_placements TO authenticated;
GRANT ALL ON public.warehouse_placements TO service_role;

-- 3) RLS
ALTER TABLE public.warehouse_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view placements"
  ON public.warehouse_placements FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers and admins can manage placements"
  ON public.warehouse_placements FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated users can create placements"
  ON public.warehouse_placements FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update placements"
  ON public.warehouse_placements FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete placements"
  ON public.warehouse_placements FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- 4) updated_at trigger
CREATE TRIGGER update_warehouse_placements_updated_at
  BEFORE UPDATE ON public.warehouse_placements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Inventory location code — lets inventory search jump to a 3D location.
ALTER TABLE public.cache_inventory
  ADD COLUMN IF NOT EXISTS warehouse_location_code text;

CREATE INDEX IF NOT EXISTS idx_cache_inventory_location_code
  ON public.cache_inventory(warehouse_location_code)
  WHERE warehouse_location_code IS NOT NULL;

-- 6) Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_placements;
