-- Create container_attributes table for workspace-level attribute definitions
CREATE TABLE public.container_attributes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'boolean', 'select')),
  options TEXT[] DEFAULT NULL,
  required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create container_attribute_values table for per-container values
CREATE TABLE public.container_attribute_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  container_id UUID NOT NULL REFERENCES public.cache_boxes(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES public.container_attributes(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(container_id, attribute_id)
);

-- Enable RLS
ALTER TABLE public.container_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.container_attribute_values ENABLE ROW LEVEL SECURITY;

-- RLS policies for container_attributes
CREATE POLICY "Users can view their own container attributes"
  ON public.container_attributes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own container attributes"
  ON public.container_attributes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own container attributes"
  ON public.container_attributes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own container attributes"
  ON public.container_attributes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for container_attribute_values (via container ownership)
CREATE POLICY "Users can view container attribute values"
  ON public.container_attribute_values FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cache_boxes 
    WHERE cache_boxes.id = container_id 
    AND cache_boxes.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert container attribute values"
  ON public.container_attribute_values FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cache_boxes 
    WHERE cache_boxes.id = container_id 
    AND cache_boxes.user_id = auth.uid()
  ));

CREATE POLICY "Users can update container attribute values"
  ON public.container_attribute_values FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.cache_boxes 
    WHERE cache_boxes.id = container_id 
    AND cache_boxes.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete container attribute values"
  ON public.container_attribute_values FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.cache_boxes 
    WHERE cache_boxes.id = container_id 
    AND cache_boxes.user_id = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_container_attributes_user_id ON public.container_attributes(user_id);
CREATE INDEX idx_container_attribute_values_container_id ON public.container_attribute_values(container_id);
CREATE INDEX idx_container_attribute_values_attribute_id ON public.container_attribute_values(attribute_id);