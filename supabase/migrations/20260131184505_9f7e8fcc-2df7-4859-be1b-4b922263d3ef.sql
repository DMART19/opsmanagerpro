-- Fix: Drop any existing user-scoped policies that were already created, then recreate consistently
-- This ensures clean, strict user isolation for all core tables

-- Drop any existing user-scoped policies that might conflict
DROP POLICY IF EXISTS "Users can view own employees" ON employees;
DROP POLICY IF EXISTS "Users can insert own employees" ON employees;
DROP POLICY IF EXISTS "Users can update own employees" ON employees;
DROP POLICY IF EXISTS "Users can delete own employees" ON employees;
DROP POLICY IF EXISTS "Users can create own employees" ON employees;

DROP POLICY IF EXISTS "Users can view own cache inventory" ON cache_inventory;
DROP POLICY IF EXISTS "Users can insert own cache inventory" ON cache_inventory;
DROP POLICY IF EXISTS "Users can update own cache inventory" ON cache_inventory;
DROP POLICY IF EXISTS "Users can delete own cache inventory" ON cache_inventory;
DROP POLICY IF EXISTS "Users can create own inventory" ON cache_inventory;

DROP POLICY IF EXISTS "Users can view own equipment" ON equipment;
DROP POLICY IF EXISTS "Users can insert own equipment" ON equipment;
DROP POLICY IF EXISTS "Users can update own equipment" ON equipment;
DROP POLICY IF EXISTS "Users can delete own equipment" ON equipment;
DROP POLICY IF EXISTS "Users can create own equipment" ON equipment;

DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create own tasks" ON tasks;

DROP POLICY IF EXISTS "Users can view own employee requirements" ON employee_requirements;
DROP POLICY IF EXISTS "Users can insert own employee requirements" ON employee_requirements;
DROP POLICY IF EXISTS "Users can update own employee requirements" ON employee_requirements;
DROP POLICY IF EXISTS "Users can delete own employee requirements" ON employee_requirements;
DROP POLICY IF EXISTS "Users can create own employee requirements" ON employee_requirements;

DROP POLICY IF EXISTS "Users can view own requirement definitions" ON requirement_definitions;
DROP POLICY IF EXISTS "Users can insert own requirement definitions" ON requirement_definitions;
DROP POLICY IF EXISTS "Users can update own requirement definitions" ON requirement_definitions;
DROP POLICY IF EXISTS "Users can delete own requirement definitions" ON requirement_definitions;

DROP POLICY IF EXISTS "Users can view own cache boxes" ON cache_boxes;
DROP POLICY IF EXISTS "Users can insert own cache boxes" ON cache_boxes;
DROP POLICY IF EXISTS "Users can update own cache boxes" ON cache_boxes;
DROP POLICY IF EXISTS "Users can delete own cache boxes" ON cache_boxes;

-- Now create strict user-scoped policies for all tables

-- cache_inventory: Strict user isolation
CREATE POLICY "Users can view own cache inventory"
ON cache_inventory FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cache inventory"
ON cache_inventory FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cache inventory"
ON cache_inventory FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cache inventory"
ON cache_inventory FOR DELETE
USING (auth.uid() = user_id);

-- employees: Strict user isolation
CREATE POLICY "Users can view own employees"
ON employees FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own employees"
ON employees FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employees"
ON employees FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own employees"
ON employees FOR DELETE
USING (auth.uid() = user_id);

-- equipment: Strict user isolation
CREATE POLICY "Users can view own equipment"
ON equipment FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own equipment"
ON equipment FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own equipment"
ON equipment FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own equipment"
ON equipment FOR DELETE
USING (auth.uid() = user_id);

-- tasks: Strict user isolation
CREATE POLICY "Users can view own tasks"
ON tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
ON tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
ON tasks FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
ON tasks FOR DELETE
USING (auth.uid() = user_id);

-- employee_requirements: Strict user isolation
CREATE POLICY "Users can view own employee requirements"
ON employee_requirements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own employee requirements"
ON employee_requirements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employee requirements"
ON employee_requirements FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own employee requirements"
ON employee_requirements FOR DELETE
USING (auth.uid() = user_id);

-- requirement_definitions: Strict user isolation
CREATE POLICY "Users can view own requirement definitions"
ON requirement_definitions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own requirement definitions"
ON requirement_definitions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requirement definitions"
ON requirement_definitions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own requirement definitions"
ON requirement_definitions FOR DELETE
USING (auth.uid() = user_id);

-- cache_boxes: Strict user isolation
CREATE POLICY "Users can view own cache boxes"
ON cache_boxes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cache boxes"
ON cache_boxes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cache boxes"
ON cache_boxes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cache boxes"
ON cache_boxes FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- CLEAN UP ORPHANED DATA (no user_id)
-- ============================================

-- Delete any records without a user_id (orphaned demo data)
DELETE FROM cache_inventory WHERE user_id IS NULL;
DELETE FROM employees WHERE user_id IS NULL;
DELETE FROM equipment WHERE user_id IS NULL;
DELETE FROM tasks WHERE user_id IS NULL;
DELETE FROM employee_requirements WHERE user_id IS NULL;
DELETE FROM requirement_definitions WHERE user_id IS NULL;
DELETE FROM cache_boxes WHERE user_id IS NULL;