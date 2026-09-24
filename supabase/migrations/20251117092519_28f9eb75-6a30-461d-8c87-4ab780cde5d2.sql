-- Create custom_pallets table for user-defined pallet sizes
CREATE TABLE public.custom_pallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  width NUMERIC NOT NULL,
  length NUMERIC NOT NULL,
  height NUMERIC,
  max_weight NUMERIC NOT NULL,
  pallet_type TEXT NOT NULL DEFAULT 'Wood',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.custom_pallets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own custom pallets
CREATE POLICY "Users can view own custom pallets"
  ON public.custom_pallets
  FOR SELECT
  USING (created_by = auth.uid());

-- Policy: Users can create custom pallets
CREATE POLICY "Users can create custom pallets"
  ON public.custom_pallets
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Policy: Users can update their own custom pallets
CREATE POLICY "Users can update own custom pallets"
  ON public.custom_pallets
  FOR UPDATE
  USING (created_by = auth.uid());

-- Policy: Users can delete their own custom pallets
CREATE POLICY "Users can delete own custom pallets"
  ON public.custom_pallets
  FOR DELETE
  USING (created_by = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_custom_pallets_updated_at
  BEFORE UPDATE ON public.custom_pallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();