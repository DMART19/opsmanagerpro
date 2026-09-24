
-- ============================================================
-- 1. Case-insensitive unique indexes on all taxonomy name columns
--    (scoped per user to allow different users to have same names)
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_manufacturers_name_ci ON public.manufacturers (user_id, lower(trim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_categories_name_ci ON public.custom_categories (created_by, lower(trim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_statuses_name_ci ON public.asset_statuses (user_id, lower(trim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_groups_name_ci ON public.asset_groups (user_id, lower(trim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_container_types_name_ci ON public.container_types (user_id, lower(trim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_container_statuses_name_ci ON public.container_statuses (user_id, lower(trim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_container_groups_name_ci ON public.container_groups (user_id, lower(trim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_name_ci ON public.departments (user_id, lower(trim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_statuses_name_ci ON public.employee_statuses (user_id, lower(trim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_roles_name_ci ON public.team_roles (user_id, lower(trim(name)));

-- ============================================================
-- 2. Validation trigger: block empty/whitespace-only names
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_taxonomy_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
    RAISE EXCEPTION 'Name cannot be empty';
  END IF;
  NEW.name := trim(NEW.name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_manufacturers_name BEFORE INSERT OR UPDATE ON public.manufacturers FOR EACH ROW EXECUTE FUNCTION public.validate_taxonomy_name();
CREATE TRIGGER trg_validate_custom_categories_name BEFORE INSERT OR UPDATE ON public.custom_categories FOR EACH ROW EXECUTE FUNCTION public.validate_taxonomy_name();
CREATE TRIGGER trg_validate_asset_statuses_name BEFORE INSERT OR UPDATE ON public.asset_statuses FOR EACH ROW EXECUTE FUNCTION public.validate_taxonomy_name();
CREATE TRIGGER trg_validate_asset_groups_name BEFORE INSERT OR UPDATE ON public.asset_groups FOR EACH ROW EXECUTE FUNCTION public.validate_taxonomy_name();
CREATE TRIGGER trg_validate_container_types_name BEFORE INSERT OR UPDATE ON public.container_types FOR EACH ROW EXECUTE FUNCTION public.validate_taxonomy_name();
CREATE TRIGGER trg_validate_container_statuses_name BEFORE INSERT OR UPDATE ON public.container_statuses FOR EACH ROW EXECUTE FUNCTION public.validate_taxonomy_name();
CREATE TRIGGER trg_validate_container_groups_name BEFORE INSERT OR UPDATE ON public.container_groups FOR EACH ROW EXECUTE FUNCTION public.validate_taxonomy_name();
CREATE TRIGGER trg_validate_departments_name BEFORE INSERT OR UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.validate_taxonomy_name();
CREATE TRIGGER trg_validate_employee_statuses_name BEFORE INSERT OR UPDATE ON public.employee_statuses FOR EACH ROW EXECUTE FUNCTION public.validate_taxonomy_name();
CREATE TRIGGER trg_validate_team_roles_name BEFORE INSERT OR UPDATE ON public.team_roles FOR EACH ROW EXECUTE FUNCTION public.validate_taxonomy_name();

-- ============================================================
-- 3. Prevent deletion of taxonomy values that are in use
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_taxonomy_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  ref_count INTEGER;
  ref_table TEXT;
  ref_column TEXT;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'manufacturers' THEN ref_table := 'cache_inventory'; ref_column := 'manufacturer_id';
    WHEN 'custom_categories' THEN ref_table := 'cache_inventory'; ref_column := 'category_id';
    WHEN 'asset_statuses' THEN ref_table := 'cache_inventory'; ref_column := 'asset_status_id';
    WHEN 'asset_groups' THEN ref_table := 'cache_inventory'; ref_column := 'asset_group_id';
    WHEN 'container_types' THEN ref_table := 'cache_boxes'; ref_column := 'container_type_id';
    WHEN 'container_statuses' THEN ref_table := 'cache_boxes'; ref_column := 'container_status_id';
    WHEN 'container_groups' THEN ref_table := 'cache_boxes'; ref_column := 'container_group_id';
    WHEN 'departments' THEN ref_table := 'employees'; ref_column := 'department_id';
    WHEN 'employee_statuses' THEN ref_table := 'employees'; ref_column := 'employee_status_id';
    WHEN 'team_roles' THEN ref_table := 'employees'; ref_column := 'role_id';
    ELSE RETURN OLD;
  END CASE;

  EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE %I = $1', ref_table, ref_column)
    INTO ref_count
    USING OLD.id;

  IF ref_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete: this value is assigned to % record(s). Reassign before deleting.', ref_count;
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_delete_manufacturers BEFORE DELETE ON public.manufacturers FOR EACH ROW EXECUTE FUNCTION public.prevent_taxonomy_delete();
CREATE TRIGGER trg_prevent_delete_custom_categories BEFORE DELETE ON public.custom_categories FOR EACH ROW EXECUTE FUNCTION public.prevent_taxonomy_delete();
CREATE TRIGGER trg_prevent_delete_asset_statuses BEFORE DELETE ON public.asset_statuses FOR EACH ROW EXECUTE FUNCTION public.prevent_taxonomy_delete();
CREATE TRIGGER trg_prevent_delete_asset_groups BEFORE DELETE ON public.asset_groups FOR EACH ROW EXECUTE FUNCTION public.prevent_taxonomy_delete();
CREATE TRIGGER trg_prevent_delete_container_types BEFORE DELETE ON public.container_types FOR EACH ROW EXECUTE FUNCTION public.prevent_taxonomy_delete();
CREATE TRIGGER trg_prevent_delete_container_statuses BEFORE DELETE ON public.container_statuses FOR EACH ROW EXECUTE FUNCTION public.prevent_taxonomy_delete();
CREATE TRIGGER trg_prevent_delete_container_groups BEFORE DELETE ON public.container_groups FOR EACH ROW EXECUTE FUNCTION public.prevent_taxonomy_delete();
CREATE TRIGGER trg_prevent_delete_departments BEFORE DELETE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.prevent_taxonomy_delete();
CREATE TRIGGER trg_prevent_delete_employee_statuses BEFORE DELETE ON public.employee_statuses FOR EACH ROW EXECUTE FUNCTION public.prevent_taxonomy_delete();
CREATE TRIGGER trg_prevent_delete_team_roles BEFORE DELETE ON public.team_roles FOR EACH ROW EXECUTE FUNCTION public.prevent_taxonomy_delete();
