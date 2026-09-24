-- Create table for requirement/credential attribute definitions
CREATE TABLE public.requirement_attributes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  options TEXT[] NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing attribute values per requirement
CREATE TABLE public.requirement_attribute_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requirement_id UUID NOT NULL REFERENCES public.requirement_definitions(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES public.requirement_attributes(id) ON DELETE CASCADE,
  value TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requirement_id, attribute_id)
);

-- Enable RLS on both tables
ALTER TABLE public.requirement_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_attribute_values ENABLE ROW LEVEL SECURITY;

-- RLS policies for requirement_attributes
CREATE POLICY "Users can view their own requirement attributes"
  ON public.requirement_attributes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requirement attributes"
  ON public.requirement_attributes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own requirement attributes"
  ON public.requirement_attributes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own requirement attributes"
  ON public.requirement_attributes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for requirement_attribute_values
-- Users can access values for requirements they own
CREATE POLICY "Users can view attribute values for their requirements"
  ON public.requirement_attribute_values FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.requirement_definitions rd
      WHERE rd.id = requirement_id AND rd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attribute values for their requirements"
  ON public.requirement_attribute_values FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requirement_definitions rd
      WHERE rd.id = requirement_id AND rd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update attribute values for their requirements"
  ON public.requirement_attribute_values FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.requirement_definitions rd
      WHERE rd.id = requirement_id AND rd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attribute values for their requirements"
  ON public.requirement_attribute_values FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.requirement_definitions rd
      WHERE rd.id = requirement_id AND rd.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at column
CREATE TRIGGER update_requirement_attributes_updated_at
  BEFORE UPDATE ON public.requirement_attributes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_requirement_attribute_values_updated_at
  BEFORE UPDATE ON public.requirement_attribute_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();