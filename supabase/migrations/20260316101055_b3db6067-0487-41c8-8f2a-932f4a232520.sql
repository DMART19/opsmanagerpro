
-- ============================================================
-- CRITICAL: Replace global role-based RLS with workspace-scoped policies
-- This prevents cross-tenant data access on tables that previously
-- used has_role() checks (granting access to ALL rows globally).
-- ============================================================

-- ============ warehouse_sections ============
DROP POLICY IF EXISTS "Managers and admins can manage sections" ON public.warehouse_sections;
CREATE POLICY "workspace_manage_sections"
  ON public.warehouse_sections FOR ALL
  TO authenticated
  USING (is_in_workspace(created_by))
  WITH CHECK (is_in_workspace(created_by));

-- ============ pallets ============
DROP POLICY IF EXISTS "Staff and above can manage pallets" ON public.pallets;
DROP POLICY IF EXISTS "Users can view pallets in own sections" ON public.pallets;
CREATE POLICY "workspace_manage_pallets"
  ON public.pallets FOR ALL
  TO authenticated
  USING (is_in_workspace(created_by))
  WITH CHECK (is_in_workspace(created_by));

-- ============ pallet_slots ============
DROP POLICY IF EXISTS "Staff and above can manage pallet slots" ON public.pallet_slots;
DROP POLICY IF EXISTS "Users can view pallet slots in own sections" ON public.pallet_slots;
CREATE POLICY "workspace_manage_pallet_slots"
  ON public.pallet_slots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.warehouse_sections ws
      WHERE ws.id = pallet_slots.section_id
      AND is_in_workspace(ws.created_by)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.warehouse_sections ws
      WHERE ws.id = pallet_slots.section_id
      AND is_in_workspace(ws.created_by)
    )
  );

-- ============ cases ============
DROP POLICY IF EXISTS "Staff and above can manage cases" ON public.cases;
DROP POLICY IF EXISTS "Users can view cases in own pallets" ON public.cases;
CREATE POLICY "workspace_manage_cases"
  ON public.cases FOR ALL
  TO authenticated
  USING (is_in_workspace(created_by))
  WITH CHECK (is_in_workspace(created_by));

-- ============ items ============
DROP POLICY IF EXISTS "Staff and above can manage items" ON public.items;
DROP POLICY IF EXISTS "Users can view items in own sections" ON public.items;
CREATE POLICY "workspace_manage_items"
  ON public.items FOR ALL
  TO authenticated
  USING (is_in_workspace(created_by))
  WITH CHECK (is_in_workspace(created_by));

-- ============ cache_box_files ============
DROP POLICY IF EXISTS "Box files viewable by all authenticated users" ON public.cache_box_files;
DROP POLICY IF EXISTS "Staff and above can manage box files" ON public.cache_box_files;
CREATE POLICY "workspace_manage_box_files"
  ON public.cache_box_files FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cache_boxes cb
      WHERE cb.id = cache_box_files.box_id
      AND is_in_workspace(cb.user_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cache_boxes cb
      WHERE cb.id = cache_box_files.box_id
      AND is_in_workspace(cb.user_id)
    )
  );

-- ============ maintenance_records ============
DROP POLICY IF EXISTS "Technicians and above can manage maintenance" ON public.maintenance_records;
DROP POLICY IF EXISTS "Users can view own equipment maintenance" ON public.maintenance_records;
CREATE POLICY "workspace_manage_maintenance"
  ON public.maintenance_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.equipment e
      WHERE e.id = maintenance_records.equipment_id
      AND is_in_workspace(e.user_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.equipment e
      WHERE e.id = maintenance_records.equipment_id
      AND is_in_workspace(e.user_id)
    )
  );

-- ============ staff ============
DROP POLICY IF EXISTS "Managers and admins can manage staff" ON public.staff;
DROP POLICY IF EXISTS "Staff can view own record" ON public.staff;
DROP POLICY IF EXISTS "Users can view own workspace staff" ON public.staff;
CREATE POLICY "workspace_manage_staff"
  ON public.staff FOR ALL
  TO authenticated
  USING (is_in_workspace(created_by))
  WITH CHECK (is_in_workspace(created_by));

-- ============ shipments ============
DROP POLICY IF EXISTS "Staff and above can create shipments" ON public.shipments;
DROP POLICY IF EXISTS "Staff and above can update shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can delete shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can view own shipments" ON public.shipments;
CREATE POLICY "workspace_manage_shipments"
  ON public.shipments FOR ALL
  TO authenticated
  USING (is_in_workspace(created_by))
  WITH CHECK (is_in_workspace(created_by));

-- ============ shipment_items ============
DROP POLICY IF EXISTS "Staff and above can manage shipment items" ON public.shipment_items;
DROP POLICY IF EXISTS "Users can view own shipment items" ON public.shipment_items;
CREATE POLICY "workspace_manage_shipment_items"
  ON public.shipment_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = shipment_items.shipment_id
      AND is_in_workspace(s.created_by)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = shipment_items.shipment_id
      AND is_in_workspace(s.created_by)
    )
  );

-- ============ employee_statuses ============
DROP POLICY IF EXISTS "Users manage own employee_statuses" ON public.employee_statuses;
CREATE POLICY "workspace_manage_employee_statuses"
  ON public.employee_statuses FOR ALL
  TO authenticated
  USING (is_in_workspace(user_id))
  WITH CHECK (is_in_workspace(user_id));
