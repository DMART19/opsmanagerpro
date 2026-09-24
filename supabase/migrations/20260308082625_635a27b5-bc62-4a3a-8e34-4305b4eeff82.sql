
-- Allow super_admins to SELECT all rows on core user-scoped tables for teleport feature
-- This enables the "View As User" admin feature

-- cache_inventory
CREATE POLICY "Super admins can read all inventory"
  ON public.cache_inventory FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- employees
CREATE POLICY "Super admins can read all employees"
  ON public.employees FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- equipment
CREATE POLICY "Super admins can read all equipment"
  ON public.equipment FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- tasks
CREATE POLICY "Super admins can read all tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- workspace_plans
CREATE POLICY "Super admins can read all workspace plans"
  ON public.workspace_plans FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- workspace_settings
CREATE POLICY "Super admins can read all workspace settings"
  ON public.workspace_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- profiles (may already have admin policy but adding super_admin specifically)
CREATE POLICY "Super admins can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- cache_boxes
CREATE POLICY "Super admins can read all containers"
  ON public.cache_boxes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- warehouses
CREATE POLICY "Super admins can read all warehouses"
  ON public.warehouses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- warehouse_sections
CREATE POLICY "Super admins can read all warehouse sections"
  ON public.warehouse_sections FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- asset_statuses, asset_groups, custom_categories, manufacturers, departments
CREATE POLICY "Super admins can read all asset statuses"
  ON public.asset_statuses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Super admins can read all asset groups"
  ON public.asset_groups FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Super admins can read all custom categories"
  ON public.custom_categories FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Super admins can read all manufacturers"
  ON public.manufacturers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Super admins can read all departments"
  ON public.departments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));
