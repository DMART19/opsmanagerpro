-- Team Member Attribute Definitions (workspace-scoped)
CREATE TABLE public.team_member_attributes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'boolean', 'select')),
  options TEXT[] DEFAULT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Team Member Attribute Values (per member)
CREATE TABLE public.team_member_attribute_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES public.team_member_attributes(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, attribute_id)
);

-- Enable RLS on both tables
ALTER TABLE public.team_member_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member_attribute_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_member_attributes
CREATE POLICY "Users can view their own attribute definitions"
ON public.team_member_attributes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attribute definitions"
ON public.team_member_attributes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attribute definitions"
ON public.team_member_attributes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attribute definitions"
ON public.team_member_attributes
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for team_member_attribute_values
-- Users can manage values for employees they own
CREATE POLICY "Users can view attribute values for their employees"
ON public.team_member_attribute_values
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = team_member_attribute_values.employee_id
    AND employees.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create attribute values for their employees"
ON public.team_member_attribute_values
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = team_member_attribute_values.employee_id
    AND employees.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update attribute values for their employees"
ON public.team_member_attribute_values
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = team_member_attribute_values.employee_id
    AND employees.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete attribute values for their employees"
ON public.team_member_attribute_values
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = team_member_attribute_values.employee_id
    AND employees.user_id = auth.uid()
  )
);

-- Indexes for performance
CREATE INDEX idx_team_member_attributes_user_id ON public.team_member_attributes(user_id);
CREATE INDEX idx_team_member_attribute_values_employee_id ON public.team_member_attribute_values(employee_id);
CREATE INDEX idx_team_member_attribute_values_attribute_id ON public.team_member_attribute_values(attribute_id);

-- Trigger for updating timestamps
CREATE TRIGGER update_team_member_attributes_updated_at
BEFORE UPDATE ON public.team_member_attributes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_member_attribute_values_updated_at
BEFORE UPDATE ON public.team_member_attribute_values
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();