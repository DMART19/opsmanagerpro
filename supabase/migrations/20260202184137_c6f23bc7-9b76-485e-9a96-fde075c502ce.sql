-- Create task_attributes table for custom field definitions
CREATE TABLE public.task_attributes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  options TEXT[] NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_attribute_values table for storing values
CREATE TABLE public.task_attribute_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES public.task_attributes(id) ON DELETE CASCADE,
  value TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, attribute_id)
);

-- Enable RLS
ALTER TABLE public.task_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attribute_values ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_attributes
CREATE POLICY "Users can view their own task attributes"
  ON public.task_attributes FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can create their own task attributes"
  ON public.task_attributes FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can update their own task attributes"
  ON public.task_attributes FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can delete their own task attributes"
  ON public.task_attributes FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- RLS policies for task_attribute_values (access through task ownership)
CREATE POLICY "Users can view task attribute values"
  ON public.task_attribute_values FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND (t.user_id = auth.uid() OR auth.uid() IS NULL)
    )
  );

CREATE POLICY "Users can create task attribute values"
  ON public.task_attribute_values FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND (t.user_id = auth.uid() OR auth.uid() IS NULL)
    )
  );

CREATE POLICY "Users can update task attribute values"
  ON public.task_attribute_values FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND (t.user_id = auth.uid() OR auth.uid() IS NULL)
    )
  );

CREATE POLICY "Users can delete task attribute values"
  ON public.task_attribute_values FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND (t.user_id = auth.uid() OR auth.uid() IS NULL)
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_task_attributes_updated_at
  BEFORE UPDATE ON public.task_attributes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_attribute_values_updated_at
  BEFORE UPDATE ON public.task_attribute_values
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();