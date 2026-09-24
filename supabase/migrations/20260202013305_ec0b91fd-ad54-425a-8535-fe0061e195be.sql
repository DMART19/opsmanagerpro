-- Create team_roles table for user-defined roles
CREATE TABLE public.team_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.team_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_roles
CREATE POLICY "Users can view their own team roles"
  ON public.team_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own team roles"
  ON public.team_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own team roles"
  ON public.team_roles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own team roles"
  ON public.team_roles FOR DELETE
  USING (auth.uid() = user_id);

-- Add role_id column to employees table to link to team_roles
ALTER TABLE public.employees 
ADD COLUMN role_id UUID REFERENCES public.team_roles(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_employees_role_id ON public.employees(role_id);

-- Add role_ids array to custom_fields to specify which roles a field applies to
-- NULL means it applies to all roles (general field)
ALTER TABLE public.custom_fields 
ADD COLUMN role_ids UUID[] DEFAULT NULL;

-- Add trigger for updated_at on team_roles
CREATE TRIGGER update_team_roles_updated_at
  BEFORE UPDATE ON public.team_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for team_roles
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_roles;