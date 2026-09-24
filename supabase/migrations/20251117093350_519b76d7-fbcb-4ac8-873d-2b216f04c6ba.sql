-- Create custom_categories table for user-defined case categories
CREATE TABLE public.custom_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#2F5FFF',
  icon TEXT DEFAULT 'Package',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view own categories"
ON public.custom_categories
FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can create own categories"
ON public.custom_categories
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own categories"
ON public.custom_categories
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete own categories"
ON public.custom_categories
FOR DELETE
USING (created_by = auth.uid());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_custom_categories_updated_at
BEFORE UPDATE ON public.custom_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();