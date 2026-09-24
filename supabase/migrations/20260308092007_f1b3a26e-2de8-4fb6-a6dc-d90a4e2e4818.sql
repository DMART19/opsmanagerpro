
-- ============================================================
-- ZERO-TRUST PERMISSION ENFORCEMENT
-- Replace simple auth.uid() = user_id RLS with workspace permission checks
-- ============================================================

-- ─── cache_inventory (assets & containers) ───────────────────

DROP POLICY IF EXISTS "Users can view own cache inventory" ON cache_inventory;
DROP POLICY IF EXISTS "Users can insert own cache inventory" ON cache_inventory;
DROP POLICY IF EXISTS "Users can update own cache inventory" ON cache_inventory;
DROP POLICY IF EXISTS "Users can delete own cache inventory" ON cache_inventory;

CREATE POLICY "workspace_view_assets" ON cache_inventory FOR SELECT TO authenticated
  USING (has_workspace_permission(user_id, 'view_assets'));

CREATE POLICY "workspace_create_assets" ON cache_inventory FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(user_id, 'create_assets'));

CREATE POLICY "workspace_edit_assets" ON cache_inventory FOR UPDATE TO authenticated
  USING (has_workspace_permission(user_id, 'edit_assets'))
  WITH CHECK (has_workspace_permission(user_id, 'edit_assets'));

CREATE POLICY "workspace_delete_assets" ON cache_inventory FOR DELETE TO authenticated
  USING (has_workspace_permission(user_id, 'delete_assets'));

-- ─── cache_boxes (containers) ────────────────────────────────

DROP POLICY IF EXISTS "Users can view own cache boxes" ON cache_boxes;
DROP POLICY IF EXISTS "Users can insert own cache boxes" ON cache_boxes;
DROP POLICY IF EXISTS "Users can update own cache boxes" ON cache_boxes;
DROP POLICY IF EXISTS "Users can delete own cache boxes" ON cache_boxes;

CREATE POLICY "workspace_view_containers" ON cache_boxes FOR SELECT TO authenticated
  USING (has_workspace_permission(user_id, 'view_containers'));

CREATE POLICY "workspace_manage_containers_insert" ON cache_boxes FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(user_id, 'manage_containers'));

CREATE POLICY "workspace_manage_containers_update" ON cache_boxes FOR UPDATE TO authenticated
  USING (has_workspace_permission(user_id, 'manage_containers'))
  WITH CHECK (has_workspace_permission(user_id, 'manage_containers'));

CREATE POLICY "workspace_manage_containers_delete" ON cache_boxes FOR DELETE TO authenticated
  USING (has_workspace_permission(user_id, 'manage_containers'));

-- ─── employees (team members) ────────────────────────────────

DROP POLICY IF EXISTS "Users can view own employees" ON employees;
DROP POLICY IF EXISTS "Users can insert own employees" ON employees;
DROP POLICY IF EXISTS "Users can update own employees" ON employees;
DROP POLICY IF EXISTS "Users can delete own employees" ON employees;

CREATE POLICY "workspace_view_team" ON employees FOR SELECT TO authenticated
  USING (has_workspace_permission(user_id, 'view_team'));

CREATE POLICY "workspace_manage_team_insert" ON employees FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(user_id, 'manage_team'));

CREATE POLICY "workspace_manage_team_update" ON employees FOR UPDATE TO authenticated
  USING (has_workspace_permission(user_id, 'manage_team'))
  WITH CHECK (has_workspace_permission(user_id, 'manage_team'));

CREATE POLICY "workspace_manage_team_delete" ON employees FOR DELETE TO authenticated
  USING (has_workspace_permission(user_id, 'manage_team'));

-- ─── certifications (credentials) ───────────────────────────

DROP POLICY IF EXISTS "Users can view own staff certifications" ON certifications;
DROP POLICY IF EXISTS "Managers and admins can manage certifications" ON certifications;

CREATE POLICY "workspace_view_credentials" ON certifications FOR SELECT TO authenticated
  USING (has_workspace_permission(created_by, 'view_credentials'));

CREATE POLICY "workspace_manage_credentials_insert" ON certifications FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(created_by, 'manage_credentials'));

CREATE POLICY "workspace_manage_credentials_update" ON certifications FOR UPDATE TO authenticated
  USING (has_workspace_permission(created_by, 'manage_credentials'))
  WITH CHECK (has_workspace_permission(created_by, 'manage_credentials'));

CREATE POLICY "workspace_manage_credentials_delete" ON certifications FOR DELETE TO authenticated
  USING (has_workspace_permission(created_by, 'manage_credentials'));

-- ─── employee_requirements (credential assignments) ─────────

DROP POLICY IF EXISTS "Users can view own employee requirements" ON employee_requirements;
DROP POLICY IF EXISTS "Users can insert own employee requirements" ON employee_requirements;
DROP POLICY IF EXISTS "Users can update own employee requirements" ON employee_requirements;
DROP POLICY IF EXISTS "Users can delete own employee requirements" ON employee_requirements;

CREATE POLICY "workspace_view_emp_requirements" ON employee_requirements FOR SELECT TO authenticated
  USING (has_workspace_permission(user_id, 'view_credentials'));

CREATE POLICY "workspace_manage_emp_requirements_insert" ON employee_requirements FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(user_id, 'manage_credentials'));

CREATE POLICY "workspace_manage_emp_requirements_update" ON employee_requirements FOR UPDATE TO authenticated
  USING (has_workspace_permission(user_id, 'manage_credentials'))
  WITH CHECK (has_workspace_permission(user_id, 'manage_credentials'));

CREATE POLICY "workspace_manage_emp_requirements_delete" ON employee_requirements FOR DELETE TO authenticated
  USING (has_workspace_permission(user_id, 'manage_credentials'));

-- ─── tasks (calendar events) ────────────────────────────────

DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

CREATE POLICY "workspace_view_tasks" ON tasks FOR SELECT TO authenticated
  USING (has_workspace_permission(user_id, 'use_calendar'));

CREATE POLICY "workspace_manage_tasks_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(user_id, 'use_calendar'));

CREATE POLICY "workspace_manage_tasks_update" ON tasks FOR UPDATE TO authenticated
  USING (has_workspace_permission(user_id, 'use_calendar'))
  WITH CHECK (has_workspace_permission(user_id, 'use_calendar'));

CREATE POLICY "workspace_manage_tasks_delete" ON tasks FOR DELETE TO authenticated
  USING (has_workspace_permission(user_id, 'use_calendar'));

-- ─── equipment ──────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own equipment" ON equipment;
DROP POLICY IF EXISTS "Users can insert own equipment" ON equipment;
DROP POLICY IF EXISTS "Users can update own equipment" ON equipment;
DROP POLICY IF EXISTS "Users can delete own equipment" ON equipment;

CREATE POLICY "workspace_view_equipment" ON equipment FOR SELECT TO authenticated
  USING (has_workspace_permission(user_id, 'view_assets'));

CREATE POLICY "workspace_create_equipment" ON equipment FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(user_id, 'create_assets'));

CREATE POLICY "workspace_edit_equipment" ON equipment FOR UPDATE TO authenticated
  USING (has_workspace_permission(user_id, 'edit_assets'))
  WITH CHECK (has_workspace_permission(user_id, 'edit_assets'));

CREATE POLICY "workspace_delete_equipment" ON equipment FOR DELETE TO authenticated
  USING (has_workspace_permission(user_id, 'delete_assets'));

-- ─── equipment_checkouts (check in/out) ─────────────────────

DROP POLICY IF EXISTS "Users can view own equipment checkouts" ON equipment_checkouts;
DROP POLICY IF EXISTS "Staff and above can create checkouts" ON equipment_checkouts;
DROP POLICY IF EXISTS "Staff and above can update checkouts" ON equipment_checkouts;

CREATE POLICY "workspace_view_checkouts" ON equipment_checkouts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM equipment e WHERE e.id = equipment_checkouts.equipment_id
    AND has_workspace_permission(e.user_id, 'check_in_out')
  ));

CREATE POLICY "workspace_create_checkouts" ON equipment_checkouts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM equipment e WHERE e.id = equipment_checkouts.equipment_id
    AND has_workspace_permission(e.user_id, 'check_in_out')
  ));

CREATE POLICY "workspace_update_checkouts" ON equipment_checkouts FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM equipment e WHERE e.id = equipment_checkouts.equipment_id
    AND has_workspace_permission(e.user_id, 'check_in_out')
  ));

-- ─── item_checkouts (check in/out) ──────────────────────────

DROP POLICY IF EXISTS "Users can view their own item checkouts" ON item_checkouts;
DROP POLICY IF EXISTS "Users can create item checkouts for their items" ON item_checkouts;
DROP POLICY IF EXISTS "Users can update their own item checkouts" ON item_checkouts;
DROP POLICY IF EXISTS "Users can delete their own item checkouts" ON item_checkouts;

CREATE POLICY "workspace_view_item_checkouts" ON item_checkouts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM cache_inventory ci WHERE ci.id = item_checkouts.item_id
    AND has_workspace_permission(ci.user_id, 'check_in_out')
  ));

CREATE POLICY "workspace_create_item_checkouts" ON item_checkouts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM cache_inventory ci WHERE ci.id = item_checkouts.item_id
    AND has_workspace_permission(ci.user_id, 'check_in_out')
  ));

CREATE POLICY "workspace_update_item_checkouts" ON item_checkouts FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM cache_inventory ci WHERE ci.id = item_checkouts.item_id
    AND has_workspace_permission(ci.user_id, 'check_in_out')
  ));

CREATE POLICY "workspace_delete_item_checkouts" ON item_checkouts FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM cache_inventory ci WHERE ci.id = item_checkouts.item_id
    AND has_workspace_permission(ci.user_id, 'check_in_out')
  ));

-- ─── Settings tables (admin-only) ───────────────────────────

DROP POLICY IF EXISTS "Users can view their own asset settings" ON asset_settings;
DROP POLICY IF EXISTS "Users can insert their own asset settings" ON asset_settings;
DROP POLICY IF EXISTS "Users can update their own asset settings" ON asset_settings;

CREATE POLICY "workspace_view_asset_settings" ON asset_settings FOR SELECT TO authenticated
  USING (has_workspace_permission(user_id, 'manage_settings'));

CREATE POLICY "workspace_insert_asset_settings" ON asset_settings FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(user_id, 'manage_settings'));

CREATE POLICY "workspace_update_asset_settings" ON asset_settings FOR UPDATE TO authenticated
  USING (has_workspace_permission(user_id, 'manage_settings'))
  WITH CHECK (has_workspace_permission(user_id, 'manage_settings'));

DROP POLICY IF EXISTS "Users can view their own compliance settings" ON compliance_settings;
DROP POLICY IF EXISTS "Users can insert their own compliance settings" ON compliance_settings;
DROP POLICY IF EXISTS "Users can update their own compliance settings" ON compliance_settings;

CREATE POLICY "workspace_view_compliance_settings" ON compliance_settings FOR SELECT TO authenticated
  USING (has_workspace_permission(user_id, 'manage_settings'));

CREATE POLICY "workspace_insert_compliance_settings" ON compliance_settings FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(user_id, 'manage_settings'));

CREATE POLICY "workspace_update_compliance_settings" ON compliance_settings FOR UPDATE TO authenticated
  USING (has_workspace_permission(user_id, 'manage_settings'))
  WITH CHECK (has_workspace_permission(user_id, 'manage_settings'));

DROP POLICY IF EXISTS "Users can view their own export settings" ON export_settings;
DROP POLICY IF EXISTS "Users can insert their own export settings" ON export_settings;
DROP POLICY IF EXISTS "Users can update their own export settings" ON export_settings;

CREATE POLICY "workspace_view_export_settings" ON export_settings FOR SELECT TO authenticated
  USING (has_workspace_permission(user_id, 'manage_settings'));

CREATE POLICY "workspace_insert_export_settings" ON export_settings FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(user_id, 'manage_settings'));

CREATE POLICY "workspace_update_export_settings" ON export_settings FOR UPDATE TO authenticated
  USING (has_workspace_permission(user_id, 'manage_settings'))
  WITH CHECK (has_workspace_permission(user_id, 'manage_settings'));

DROP POLICY IF EXISTS "Users can view their own workspace settings" ON workspace_settings;
DROP POLICY IF EXISTS "Users can insert their own workspace settings" ON workspace_settings;
DROP POLICY IF EXISTS "Users can update their own workspace settings" ON workspace_settings;

CREATE POLICY "workspace_view_workspace_settings" ON workspace_settings FOR SELECT TO authenticated
  USING (has_workspace_permission(user_id, 'manage_settings'));

CREATE POLICY "workspace_insert_workspace_settings" ON workspace_settings FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(user_id, 'manage_settings'));

CREATE POLICY "workspace_update_workspace_settings" ON workspace_settings FOR UPDATE TO authenticated
  USING (has_workspace_permission(user_id, 'manage_settings'))
  WITH CHECK (has_workspace_permission(user_id, 'manage_settings'));
