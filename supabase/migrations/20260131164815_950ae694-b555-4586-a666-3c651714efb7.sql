-- =====================================================
-- MIGRATION: Enforce User-Scoped Data for Production Mode
-- =====================================================
-- This migration adds user ownership to core tables and updates
-- RLS policies to ensure data isolation between users.

-- 1. Add user_id columns to core tables that don't have them
-- =====================================================

-- Add user_id to cache_inventory if not exists
ALTER TABLE public.cache_inventory 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to employees if not exists  
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to tasks if not exists
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to equipment if not exists (created_by exists but we need explicit user_id)
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to cache_boxes if not exists
ALTER TABLE public.cache_boxes
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to requirement_definitions if not exists
ALTER TABLE public.requirement_definitions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to employee_requirements if not exists
ALTER TABLE public.employee_requirements
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Drop existing overly permissive RLS policies
-- =====================================================

-- Drop old policies for cache_inventory
DROP POLICY IF EXISTS "Enable read access for all users" ON public.cache_inventory;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.cache_inventory;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.cache_inventory;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.cache_inventory;
DROP POLICY IF EXISTS "Allow all operations for demo mode" ON public.cache_inventory;

-- Drop old policies for employees
DROP POLICY IF EXISTS "Enable read access for all users" ON public.employees;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.employees;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.employees;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.employees;
DROP POLICY IF EXISTS "Allow all operations for demo mode" ON public.employees;

-- Drop old policies for tasks
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Allow all operations for demo mode" ON public.tasks;
DROP POLICY IF EXISTS "Allow read for anonymous users" ON public.tasks;

-- Drop old policies for equipment
DROP POLICY IF EXISTS "Enable read access for all users" ON public.equipment;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.equipment;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.equipment;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.equipment;

-- Drop old policies for requirement_definitions
DROP POLICY IF EXISTS "Enable read access for all users" ON public.requirement_definitions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.requirement_definitions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.requirement_definitions;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.requirement_definitions;

-- Drop old policies for employee_requirements
DROP POLICY IF EXISTS "Enable read access for all users" ON public.employee_requirements;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.employee_requirements;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.employee_requirements;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.employee_requirements;

-- 3. Create new user-scoped RLS policies
-- =====================================================

-- cache_inventory policies - users can only access their own data
CREATE POLICY "Users can view own inventory"
ON public.cache_inventory FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own inventory"
ON public.cache_inventory FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory"
ON public.cache_inventory FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory"
ON public.cache_inventory FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- employees policies - users can only access their own team
CREATE POLICY "Users can view own employees"
ON public.employees FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own employees"
ON public.employees FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employees"
ON public.employees FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own employees"
ON public.employees FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- tasks policies - users can only access their own tasks
CREATE POLICY "Users can view own tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
ON public.tasks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- equipment policies - users can only access their own equipment
CREATE POLICY "Users can view own equipment"
ON public.equipment FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own equipment"
ON public.equipment FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own equipment"
ON public.equipment FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own equipment"
ON public.equipment FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- requirement_definitions policies - users can only access their own requirements
CREATE POLICY "Users can view own requirements"
ON public.requirement_definitions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own requirements"
ON public.requirement_definitions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requirements"
ON public.requirement_definitions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own requirements"
ON public.requirement_definitions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- employee_requirements policies - users can only access their own employee requirements
CREATE POLICY "Users can view own employee requirements"
ON public.employee_requirements FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own employee requirements"
ON public.employee_requirements FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employee requirements"
ON public.employee_requirements FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own employee requirements"
ON public.employee_requirements FOR DELETE
TO authenticated
USING (auth.uid() = user_id);