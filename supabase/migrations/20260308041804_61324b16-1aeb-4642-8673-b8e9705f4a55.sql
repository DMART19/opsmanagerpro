
-- Performance indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_cache_inventory_user_id ON public.cache_inventory (user_id);
CREATE INDEX IF NOT EXISTS idx_cache_inventory_asset_status_id ON public.cache_inventory (asset_status_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id_status ON public.tasks (user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON public.tasks (start_date);
CREATE INDEX IF NOT EXISTS idx_employee_requirements_status ON public.employee_requirements (status);
CREATE INDEX IF NOT EXISTS idx_employee_requirements_employee_id ON public.employee_requirements (employee_id);
CREATE INDEX IF NOT EXISTS idx_equipment_checkouts_status ON public.equipment_checkouts (status);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_status ON public.maintenance_records (status);
CREATE INDEX IF NOT EXISTS idx_item_checkouts_checked_in_at ON public.item_checkouts (checked_in_at);
CREATE INDEX IF NOT EXISTS idx_requirement_definitions_is_active ON public.requirement_definitions (is_active);
