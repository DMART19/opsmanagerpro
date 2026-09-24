-- CLEANUP: Remove all remaining legacy permissive policies that bypass user isolation
-- This ensures ONLY user-scoped policies remain active

-- cache_inventory: Remove remaining legacy policies
DROP POLICY IF EXISTS "Cache inventory viewable by all authenticated users" ON cache_inventory;
DROP POLICY IF EXISTS "Demo users can manage demo cache inventory" ON cache_inventory;
DROP POLICY IF EXISTS "Staff and above can manage cache inventory" ON cache_inventory;
DROP POLICY IF EXISTS "Users can view own inventory" ON cache_inventory;
DROP POLICY IF EXISTS "Users can update own inventory" ON cache_inventory;
DROP POLICY IF EXISTS "Users can delete own inventory" ON cache_inventory;

-- employees: Remove remaining legacy policies  
DROP POLICY IF EXISTS "Employees viewable by authenticated users" ON employees;
DROP POLICY IF EXISTS "Demo users can manage demo employees" ON employees;
DROP POLICY IF EXISTS "Managers and admins can manage employees" ON employees;

-- equipment: Remove remaining legacy policies
DROP POLICY IF EXISTS "Equipment viewable by all authenticated users" ON equipment;
DROP POLICY IF EXISTS "Demo users can manage equipment in demo warehouse" ON equipment;
DROP POLICY IF EXISTS "Managers and admins can update equipment" ON equipment;
DROP POLICY IF EXISTS "Staff and above can insert equipment" ON equipment;
DROP POLICY IF EXISTS "Admins can delete equipment" ON equipment;

-- tasks: Remove remaining legacy policies
DROP POLICY IF EXISTS "Authenticated users can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON tasks;

-- employee_requirements: Remove remaining legacy policies
DROP POLICY IF EXISTS "Employee requirements viewable by authenticated users" ON employee_requirements;
DROP POLICY IF EXISTS "Staff and above can manage employee requirements" ON employee_requirements;

-- requirement_definitions: Remove remaining legacy policies
DROP POLICY IF EXISTS "Requirements viewable by authenticated users" ON requirement_definitions;
DROP POLICY IF EXISTS "Managers and admins can manage requirements" ON requirement_definitions;
DROP POLICY IF EXISTS "Users can view own requirements" ON requirement_definitions;
DROP POLICY IF EXISTS "Users can update own requirements" ON requirement_definitions;
DROP POLICY IF EXISTS "Users can delete own requirements" ON requirement_definitions;

-- cache_boxes: Remove remaining legacy policies
DROP POLICY IF EXISTS "Boxes viewable by all authenticated users" ON cache_boxes;
DROP POLICY IF EXISTS "Staff and above can manage boxes" ON cache_boxes;