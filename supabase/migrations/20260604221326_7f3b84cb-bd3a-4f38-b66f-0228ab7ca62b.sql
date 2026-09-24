
CREATE TABLE public.load_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  warehouse_id uuid,
  assigned_trailer_layout_id uuid REFERENCES public.saved_trailer_layouts(id) ON DELETE SET NULL,
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.load_plans TO authenticated;
GRANT ALL ON public.load_plans TO service_role;

ALTER TABLE public.load_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own load plans" ON public.load_plans
  FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users can create load plans" ON public.load_plans
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own load plans" ON public.load_plans
  FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can delete own load plans" ON public.load_plans
  FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE TRIGGER update_load_plans_updated_at
  BEFORE UPDATE ON public.load_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_load_plans_created_by ON public.load_plans(created_by) WHERE deleted_at IS NULL;


CREATE TABLE public.space_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_plan_id uuid REFERENCES public.load_plans(id) ON DELETE CASCADE,
  pallet_id uuid NOT NULL,
  section_id uuid,
  zone_label text,
  position jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  assigned_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.space_assignments TO authenticated;
GRANT ALL ON public.space_assignments TO service_role;

ALTER TABLE public.space_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own space assignments" ON public.space_assignments
  FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users can create space assignments" ON public.space_assignments
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own space assignments" ON public.space_assignments
  FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can delete own space assignments" ON public.space_assignments
  FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE INDEX idx_space_assignments_load_plan ON public.space_assignments(load_plan_id);
CREATE INDEX idx_space_assignments_created_by ON public.space_assignments(created_by);
