
-- Performance indexes for frequently queried columns
-- These are CREATE INDEX IF NOT EXISTS to be idempotent

-- cache_inventory: user_id is used in almost every query
CREATE INDEX IF NOT EXISTS idx_cache_inventory_user_id ON public.cache_inventory (user_id);
CREATE INDEX IF NOT EXISTS idx_cache_inventory_asset_type ON public.cache_inventory (asset_type);
CREATE INDEX IF NOT EXISTS idx_cache_inventory_container_id ON public.cache_inventory (container_id);
CREATE INDEX IF NOT EXISTS idx_cache_inventory_created_at ON public.cache_inventory (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cache_inventory_asset_status_id ON public.cache_inventory (asset_status_id);
CREATE INDEX IF NOT EXISTS idx_cache_inventory_category_id ON public.cache_inventory (category_id);

-- employees: user_id + status filtering
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees (user_id);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON public.employees (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON public.employees (department_id);
CREATE INDEX IF NOT EXISTS idx_employees_role_id ON public.employees (role_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_status_id ON public.employees (employee_status_id);

-- employee_requirements: frequently joined and filtered
CREATE INDEX IF NOT EXISTS idx_employee_requirements_employee_id ON public.employee_requirements (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_requirements_requirement_id ON public.employee_requirements (requirement_id);
CREATE INDEX IF NOT EXISTS idx_employee_requirements_status ON public.employee_requirements (status);
CREATE INDEX IF NOT EXISTS idx_employee_requirements_expire_date ON public.employee_requirements (expire_date);

-- equipment: user_id + status
CREATE INDEX IF NOT EXISTS idx_equipment_user_id ON public.equipment (user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON public.equipment (status);
CREATE INDEX IF NOT EXISTS idx_equipment_created_at ON public.equipment (created_at DESC);

-- equipment_checkouts: status filtering + FK lookups
CREATE INDEX IF NOT EXISTS idx_equipment_checkouts_status ON public.equipment_checkouts (status);
CREATE INDEX IF NOT EXISTS idx_equipment_checkouts_equipment_id ON public.equipment_checkouts (equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_checkouts_staff_id ON public.equipment_checkouts (staff_id);
CREATE INDEX IF NOT EXISTS idx_equipment_checkouts_checkout_date ON public.equipment_checkouts (checkout_date DESC);

-- tasks: user_id + status + date range queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON public.tasks (start_date);

-- maintenance_records: status + date sorting
CREATE INDEX IF NOT EXISTS idx_maintenance_records_status ON public.maintenance_records (status);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_equipment_id ON public.maintenance_records (equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_next_maintenance_date ON public.maintenance_records (next_maintenance_date);

-- error_logs: status + last_seen_at for admin queries
CREATE INDEX IF NOT EXISTS idx_error_logs_status ON public.error_logs (status);
CREATE INDEX IF NOT EXISTS idx_error_logs_last_seen_at ON public.error_logs (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_hash ON public.error_logs (error_hash);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs (severity);

-- certifications: staff_id + expiry_date
CREATE INDEX IF NOT EXISTS idx_certifications_staff_id ON public.certifications (staff_id);
CREATE INDEX IF NOT EXISTS idx_certifications_expiry_date ON public.certifications (expiry_date);

-- cache_boxes: user_id + section
CREATE INDEX IF NOT EXISTS idx_cache_boxes_user_id ON public.cache_boxes (user_id);
CREATE INDEX IF NOT EXISTS idx_cache_boxes_section_id ON public.cache_boxes (section_id);

-- item_checkouts: item_id + employee_id for join performance
CREATE INDEX IF NOT EXISTS idx_item_checkouts_item_id ON public.item_checkouts (item_id);
CREATE INDEX IF NOT EXISTS idx_item_checkouts_employee_id ON public.item_checkouts (employee_id);
CREATE INDEX IF NOT EXISTS idx_item_checkouts_checked_in_at ON public.item_checkouts (checked_in_at);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks (user_id, status);
CREATE INDEX IF NOT EXISTS idx_equipment_checkouts_status_date ON public.equipment_checkouts (status, checkout_date DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_status_severity ON public.error_logs (status, severity);
