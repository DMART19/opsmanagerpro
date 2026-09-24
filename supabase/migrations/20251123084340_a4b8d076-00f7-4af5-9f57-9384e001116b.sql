-- Create mapping templates table
CREATE TABLE IF NOT EXISTS public.mapping_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  table_name TEXT NOT NULL,
  field_mappings JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create custom fields table for dynamic schema
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  validation_rules JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(table_name, field_name)
);

-- Enable RLS
ALTER TABLE public.mapping_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- Policies for mapping_templates
CREATE POLICY "Users can view own templates"
  ON public.mapping_templates FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create templates"
  ON public.mapping_templates FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own templates"
  ON public.mapping_templates FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own templates"
  ON public.mapping_templates FOR DELETE
  USING (created_by = auth.uid());

-- Policies for custom_fields
CREATE POLICY "Users can view custom fields"
  ON public.custom_fields FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage custom fields"
  ON public.custom_fields FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_mapping_templates_updated_at
  BEFORE UPDATE ON public.mapping_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_fields_updated_at
  BEFORE UPDATE ON public.custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();