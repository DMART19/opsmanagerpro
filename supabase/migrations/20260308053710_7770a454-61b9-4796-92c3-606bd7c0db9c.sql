-- Fix admin_alerts: restrict INSERT/UPDATE/SELECT to admin role only
DROP POLICY IF EXISTS "Authenticated users can insert admin_alerts" ON public.admin_alerts;
DROP POLICY IF EXISTS "Authenticated users can read admin_alerts" ON public.admin_alerts;
DROP POLICY IF EXISTS "Authenticated users can update admin_alerts" ON public.admin_alerts;

CREATE POLICY "Admins can insert admin_alerts"
ON public.admin_alerts FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can read admin_alerts"
ON public.admin_alerts FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update admin_alerts"
ON public.admin_alerts FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix cross-tenant: scope pallets SELECT to section owner
DROP POLICY IF EXISTS "Pallets viewable by all authenticated users" ON public.pallets;
CREATE POLICY "Users can view pallets in own sections"
ON public.pallets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM warehouse_sections ws
    WHERE ws.id = pallets.section_id AND ws.created_by = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix cross-tenant: scope cases SELECT
DROP POLICY IF EXISTS "Cases viewable by all authenticated users" ON public.cases;
CREATE POLICY "Users can view cases in own pallets"
ON public.cases FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pallets p
    JOIN warehouse_sections ws ON ws.id = p.section_id
    WHERE p.id = cases.pallet_id AND ws.created_by = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix cross-tenant: scope items SELECT
DROP POLICY IF EXISTS "Items viewable by all authenticated users" ON public.items;
CREATE POLICY "Users can view items in own sections"
ON public.items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM warehouse_sections ws
    WHERE ws.id = items.section_id AND ws.created_by = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix cross-tenant: scope pallet_slots SELECT
DROP POLICY IF EXISTS "Pallet slots viewable by all authenticated users" ON public.pallet_slots;
CREATE POLICY "Users can view pallet slots in own sections"
ON public.pallet_slots FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM warehouse_sections ws
    WHERE ws.id = pallet_slots.section_id AND ws.created_by = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix cross-tenant: scope maintenance_records SELECT
DROP POLICY IF EXISTS "Maintenance records viewable by all authenticated users" ON public.maintenance_records;
CREATE POLICY "Users can view own equipment maintenance"
ON public.maintenance_records FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM equipment e
    WHERE e.id = maintenance_records.equipment_id AND e.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix cross-tenant: scope staff SELECT
DROP POLICY IF EXISTS "Managers and admins can view all staff" ON public.staff;
CREATE POLICY "Users can view own workspace staff"
ON public.staff FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR created_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);