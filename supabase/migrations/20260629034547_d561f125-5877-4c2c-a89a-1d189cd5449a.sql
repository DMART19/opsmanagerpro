
-- Digital twin layout dimensions on warehouses
ALTER TABLE public.warehouses
  ADD COLUMN IF NOT EXISTS twin_width_ft numeric,
  ADD COLUMN IF NOT EXISTS twin_length_ft numeric,
  ADD COLUMN IF NOT EXISTS twin_height_ft numeric;

-- Twin objects: walls, zones, racks, doors, docks, columns, etc.
CREATE TABLE IF NOT EXISTS public.warehouse_twin_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  kind text NOT NULL,
  label text,
  color text,
  x numeric NOT NULL DEFAULT 0,
  y numeric NOT NULL DEFAULT 0,
  z numeric NOT NULL DEFAULT 0,
  rotation numeric NOT NULL DEFAULT 0,
  width numeric NOT NULL DEFAULT 4,
  depth numeric NOT NULL DEFAULT 4,
  height numeric NOT NULL DEFAULT 4,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouse_twin_objects TO authenticated;
GRANT ALL ON public.warehouse_twin_objects TO service_role;

ALTER TABLE public.warehouse_twin_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and admins can manage twin objects"
  ON public.warehouse_twin_objects
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated users can view twin objects"
  ON public.warehouse_twin_objects
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_warehouse_twin_objects_warehouse ON public.warehouse_twin_objects(warehouse_id);

CREATE TRIGGER update_warehouse_twin_objects_updated_at
  BEFORE UPDATE ON public.warehouse_twin_objects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
