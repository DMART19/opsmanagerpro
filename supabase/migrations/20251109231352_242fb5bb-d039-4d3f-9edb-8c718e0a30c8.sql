-- Add audit triggers to all critical tables for complete compliance tracking

-- Equipment audit trigger
CREATE TRIGGER audit_equipment_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Staff audit trigger
CREATE TRIGGER audit_staff_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Certifications audit trigger
CREATE TRIGGER audit_certifications_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Maintenance records audit trigger
CREATE TRIGGER audit_maintenance_records_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_records
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Warehouses audit trigger
CREATE TRIGGER audit_warehouses_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Equipment checkouts audit trigger
CREATE TRIGGER audit_equipment_checkouts_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.equipment_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();