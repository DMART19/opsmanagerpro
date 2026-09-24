-- Create custom trailers table
CREATE TABLE public.custom_trailers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  length NUMERIC NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  max_weight NUMERIC NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_trailers ENABLE ROW LEVEL SECURITY;

-- Create policies for custom trailers
CREATE POLICY "Users can view own trailers"
ON public.custom_trailers
FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can create trailers"
ON public.custom_trailers
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own trailers"
ON public.custom_trailers
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete own trailers"
ON public.custom_trailers
FOR DELETE
USING (created_by = auth.uid());

-- Create saved trailer layouts table
CREATE TABLE public.saved_trailer_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trailer_id UUID REFERENCES public.custom_trailers(id) ON DELETE CASCADE,
  layout_data JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_trailer_layouts ENABLE ROW LEVEL SECURITY;

-- Create policies for saved trailer layouts
CREATE POLICY "Users can view own layouts"
ON public.saved_trailer_layouts
FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can create layouts"
ON public.saved_trailer_layouts
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own layouts"
ON public.saved_trailer_layouts
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete own layouts"
ON public.saved_trailer_layouts
FOR DELETE
USING (created_by = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_custom_trailers_updated_at
BEFORE UPDATE ON public.custom_trailers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_trailer_layouts_updated_at
BEFORE UPDATE ON public.saved_trailer_layouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();