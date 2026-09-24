-- Add expiration tracking fields to requirement_definitions
ALTER TABLE requirement_definitions
ADD COLUMN IF NOT EXISTS has_expiration boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS renewal_cycle_months integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS attachment_url text DEFAULT NULL;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_requirement_definitions_type 
ON requirement_definitions(requirement_type);

CREATE INDEX IF NOT EXISTS idx_requirement_definitions_active 
ON requirement_definitions(is_active);

CREATE INDEX IF NOT EXISTS idx_employee_requirements_status 
ON employee_requirements(status);

CREATE INDEX IF NOT EXISTS idx_employee_requirements_expire 
ON employee_requirements(expire_date);

-- Function to auto-assign general requirements to new employees
CREATE OR REPLACE FUNCTION assign_general_requirements_to_employee()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert employee_requirements for all active general requirements
  INSERT INTO employee_requirements (employee_id, requirement_id, status)
  SELECT NEW.id, rd.id, 'Missing'
  FROM requirement_definitions rd
  WHERE rd.is_active = true 
    AND rd.is_general = true
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-assign general requirements when employee is created
DROP TRIGGER IF EXISTS trigger_assign_general_requirements ON employees;
CREATE TRIGGER trigger_assign_general_requirements
AFTER INSERT ON employees
FOR EACH ROW
EXECUTE FUNCTION assign_general_requirements_to_employee();

-- Function to auto-assign new general requirement to all employees
CREATE OR REPLACE FUNCTION assign_requirement_to_all_employees()
RETURNS TRIGGER AS $$
BEGIN
  -- If requirement is set as general, assign to all active employees
  IF NEW.is_general = true AND NEW.is_active = true THEN
    INSERT INTO employee_requirements (employee_id, requirement_id, status)
    SELECT e.id, NEW.id, 'Missing'
    FROM employees e
    WHERE e.status = 'Active'
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-assign requirement when it becomes general
DROP TRIGGER IF EXISTS trigger_assign_requirement_to_employees ON requirement_definitions;
CREATE TRIGGER trigger_assign_requirement_to_employees
AFTER INSERT OR UPDATE OF is_general, is_active ON requirement_definitions
FOR EACH ROW
EXECUTE FUNCTION assign_requirement_to_all_employees();