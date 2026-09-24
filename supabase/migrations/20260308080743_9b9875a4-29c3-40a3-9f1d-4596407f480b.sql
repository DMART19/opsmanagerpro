
-- Attach audit_trigger to all key operational tables
-- The audit_trigger() function already exists and captures INSERT/UPDATE/DELETE

-- Assets & Inventory
CREATE OR REPLACE TRIGGER audit_cache_inventory
  AFTER INSERT OR UPDATE OR DELETE ON public.cache_inventory
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE OR REPLACE TRIGGER audit_cache_boxes
  AFTER INSERT OR UPDATE OR DELETE ON public.cache_boxes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Equipment
CREATE OR REPLACE TRIGGER audit_equipment
  AFTER INSERT OR UPDATE OR DELETE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE OR REPLACE TRIGGER audit_equipment_checkouts
  AFTER INSERT OR UPDATE OR DELETE ON public.equipment_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Team
CREATE OR REPLACE TRIGGER audit_employees
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE OR REPLACE TRIGGER audit_staff
  AFTER INSERT OR UPDATE OR DELETE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Credentials & Certifications
CREATE OR REPLACE TRIGGER audit_certifications
  AFTER INSERT OR UPDATE OR DELETE ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE OR REPLACE TRIGGER audit_employee_requirements
  AFTER INSERT OR UPDATE OR DELETE ON public.employee_requirements
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Workspace & Roles
CREATE OR REPLACE TRIGGER audit_workspace_members
  AFTER INSERT OR UPDATE OR DELETE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE OR REPLACE TRIGGER audit_workspace_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.workspace_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE OR REPLACE TRIGGER audit_workspace_plans
  AFTER INSERT OR UPDATE OR DELETE ON public.workspace_plans
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Pallets & Logistics
CREATE OR REPLACE TRIGGER audit_pallets
  AFTER INSERT OR UPDATE OR DELETE ON public.pallets
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE OR REPLACE TRIGGER audit_cases
  AFTER INSERT OR UPDATE OR DELETE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE OR REPLACE TRIGGER audit_items
  AFTER INSERT OR UPDATE OR DELETE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE OR REPLACE TRIGGER audit_saved_trailer_layouts
  AFTER INSERT OR UPDATE OR DELETE ON public.saved_trailer_layouts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Item Checkouts
CREATE OR REPLACE TRIGGER audit_item_checkouts
  AFTER INSERT OR UPDATE OR DELETE ON public.item_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Tasks
CREATE OR REPLACE TRIGGER audit_tasks
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Warehouses
CREATE OR REPLACE TRIGGER audit_warehouses
  AFTER INSERT OR UPDATE OR DELETE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE OR REPLACE TRIGGER audit_warehouse_sections
  AFTER INSERT OR UPDATE OR DELETE ON public.warehouse_sections
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
