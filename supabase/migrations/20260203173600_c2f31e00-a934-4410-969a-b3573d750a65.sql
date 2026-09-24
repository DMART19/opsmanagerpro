-- Fix 1: custom_fields - Restrict SELECT to owner (users can only see their own custom fields based on created_by)
-- Drop the permissive policy and replace with owner-scoped policy
DROP POLICY IF EXISTS "Users can view custom fields" ON public.custom_fields;

CREATE POLICY "Users can view own custom fields" ON public.custom_fields
FOR SELECT TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: task_attributes - Remove the NULL auth.uid() condition (was allowing anonymous users)
DROP POLICY IF EXISTS "Users can create their own task attributes" ON public.task_attributes;
DROP POLICY IF EXISTS "Users can delete their own task attributes" ON public.task_attributes;
DROP POLICY IF EXISTS "Users can update their own task attributes" ON public.task_attributes;
DROP POLICY IF EXISTS "Users can view their own task attributes" ON public.task_attributes;

CREATE POLICY "Users can create their own task attributes" ON public.task_attributes
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task attributes" ON public.task_attributes
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own task attributes" ON public.task_attributes
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own task attributes" ON public.task_attributes
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Fix 3: task_attribute_values - Remove the NULL auth.uid() condition
DROP POLICY IF EXISTS "Users can create task attribute values" ON public.task_attribute_values;
DROP POLICY IF EXISTS "Users can delete task attribute values" ON public.task_attribute_values;
DROP POLICY IF EXISTS "Users can update task attribute values" ON public.task_attribute_values;
DROP POLICY IF EXISTS "Users can view task attribute values" ON public.task_attribute_values;

CREATE POLICY "Users can create task attribute values" ON public.task_attribute_values
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.id = task_attribute_values.task_id AND t.user_id = auth.uid()
));

CREATE POLICY "Users can delete task attribute values" ON public.task_attribute_values
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.id = task_attribute_values.task_id AND t.user_id = auth.uid()
));

CREATE POLICY "Users can update task attribute values" ON public.task_attribute_values
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.id = task_attribute_values.task_id AND t.user_id = auth.uid()
));

CREATE POLICY "Users can view task attribute values" ON public.task_attribute_values
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.id = task_attribute_values.task_id AND t.user_id = auth.uid()
));

-- Fix 4: profiles - Remove conflicting "Deny anonymous access" policy since we have proper owner-scoped policies
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;