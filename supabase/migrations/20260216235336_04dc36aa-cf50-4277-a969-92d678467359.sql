
-- 1. Manufacturers
CREATE TABLE public.manufacturers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_manufacturers_unique_name ON public.manufacturers (user_id, lower(trim(name)));
ALTER TABLE public.manufacturers ADD CONSTRAINT manufacturers_name_not_empty CHECK (trim(name) <> '');
CREATE TRIGGER update_manufacturers_updated_at BEFORE UPDATE ON public.manufacturers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Users manage own manufacturers" ON public.manufacturers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Asset Groups (group_abbv)
CREATE TABLE public.asset_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_groups ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_asset_groups_unique_name ON public.asset_groups (user_id, lower(trim(name)));
ALTER TABLE public.asset_groups ADD CONSTRAINT asset_groups_name_not_empty CHECK (trim(name) <> '');
CREATE TRIGGER update_asset_groups_updated_at BEFORE UPDATE ON public.asset_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Users manage own asset_groups" ON public.asset_groups FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Departments
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_departments_unique_name ON public.departments (user_id, lower(trim(name)));
ALTER TABLE public.departments ADD CONSTRAINT departments_name_not_empty CHECK (trim(name) <> '');
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Users manage own departments" ON public.departments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Employee Statuses
CREATE TABLE public.employee_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_statuses ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_employee_statuses_unique_name ON public.employee_statuses (user_id, lower(trim(name)));
ALTER TABLE public.employee_statuses ADD CONSTRAINT employee_statuses_name_not_empty CHECK (trim(name) <> '');
CREATE TRIGGER update_employee_statuses_updated_at BEFORE UPDATE ON public.employee_statuses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Users manage own employee_statuses" ON public.employee_statuses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Container Types
CREATE TABLE public.container_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.container_types ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_container_types_unique_name ON public.container_types (user_id, lower(trim(name)));
ALTER TABLE public.container_types ADD CONSTRAINT container_types_name_not_empty CHECK (trim(name) <> '');
CREATE TRIGGER update_container_types_updated_at BEFORE UPDATE ON public.container_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Users manage own container_types" ON public.container_types FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Container Statuses
CREATE TABLE public.container_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.container_statuses ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_container_statuses_unique_name ON public.container_statuses (user_id, lower(trim(name)));
ALTER TABLE public.container_statuses ADD CONSTRAINT container_statuses_name_not_empty CHECK (trim(name) <> '');
CREATE TRIGGER update_container_statuses_updated_at BEFORE UPDATE ON public.container_statuses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Users manage own container_statuses" ON public.container_statuses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Container Groups (x_group_display)
CREATE TABLE public.container_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.container_groups ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_container_groups_unique_name ON public.container_groups (user_id, lower(trim(name)));
ALTER TABLE public.container_groups ADD CONSTRAINT container_groups_name_not_empty CHECK (trim(name) <> '');
CREATE TRIGGER update_container_groups_updated_at BEFORE UPDATE ON public.container_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Users manage own container_groups" ON public.container_groups FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. Requirement Types
CREATE TABLE public.requirement_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.requirement_types ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_requirement_types_unique_name ON public.requirement_types (user_id, lower(trim(name)));
ALTER TABLE public.requirement_types ADD CONSTRAINT requirement_types_name_not_empty CHECK (trim(name) <> '');
CREATE TRIGGER update_requirement_types_updated_at BEFORE UPDATE ON public.requirement_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Users manage own requirement_types" ON public.requirement_types FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. Asset Statuses
CREATE TABLE public.asset_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_statuses ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_asset_statuses_unique_name ON public.asset_statuses (user_id, lower(trim(name)));
ALTER TABLE public.asset_statuses ADD CONSTRAINT asset_statuses_name_not_empty CHECK (trim(name) <> '');
CREATE TRIGGER update_asset_statuses_updated_at BEFORE UPDATE ON public.asset_statuses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Users manage own asset_statuses" ON public.asset_statuses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== ADD FK COLUMNS TO PARENT TABLES (existing string columns preserved) =====

-- cache_inventory: manufacturer_id, asset_group_id, asset_status_id, category_id
ALTER TABLE public.cache_inventory
  ADD COLUMN IF NOT EXISTS manufacturer_id UUID REFERENCES public.manufacturers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS asset_group_id UUID REFERENCES public.asset_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS asset_status_id UUID REFERENCES public.asset_statuses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.custom_categories(id) ON DELETE SET NULL;

-- employees: department_id, employee_status_id
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS employee_status_id UUID REFERENCES public.employee_statuses(id) ON DELETE SET NULL;

-- cache_boxes: container_type_id, container_status_id, container_group_id
ALTER TABLE public.cache_boxes
  ADD COLUMN IF NOT EXISTS container_type_id UUID REFERENCES public.container_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS container_status_id UUID REFERENCES public.container_statuses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS container_group_id UUID REFERENCES public.container_groups(id) ON DELETE SET NULL;

-- requirement_definitions: requirement_type_id
ALTER TABLE public.requirement_definitions
  ADD COLUMN IF NOT EXISTS requirement_type_id UUID REFERENCES public.requirement_types(id) ON DELETE SET NULL;
