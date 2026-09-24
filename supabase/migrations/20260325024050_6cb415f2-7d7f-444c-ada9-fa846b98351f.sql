
-- Remove auto-assign triggers that create false credential assignments
-- These triggers violate the explicit assignment model

-- Drop trigger that auto-assigns general requirements to new employees
DROP TRIGGER IF EXISTS trigger_assign_general_requirements ON employees;
DROP FUNCTION IF EXISTS assign_general_requirements_to_employee();

-- Drop trigger that auto-assigns new general requirements to all employees
DROP TRIGGER IF EXISTS trigger_assign_requirement_to_employees ON requirement_definitions;
DROP FUNCTION IF EXISTS assign_requirement_to_all_employees();

-- Clean up existing auto-assigned "Missing" records that were never explicitly assigned
-- These are phantom assignments created by the old triggers
DELETE FROM employee_requirements 
WHERE status = 'Missing' 
  AND issue_date IS NULL 
  AND expire_date IS NULL 
  AND attachment_url IS NULL 
  AND notes IS NULL
  AND verified_at IS NULL;
