-- Create table for saved pallet builds
CREATE TABLE public.saved_pallet_builds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  pallet_data jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_pallet_builds ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved pallets
CREATE POLICY "Users can view own saved pallets"
ON public.saved_pallet_builds
FOR SELECT
USING (created_by = auth.uid());

-- Users can create their own saved pallets
CREATE POLICY "Users can create saved pallets"
ON public.saved_pallet_builds
FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Users can update their own saved pallets
CREATE POLICY "Users can update own saved pallets"
ON public.saved_pallet_builds
FOR UPDATE
USING (created_by = auth.uid());

-- Users can delete their own saved pallets
CREATE POLICY "Users can delete own saved pallets"
ON public.saved_pallet_builds
FOR DELETE
USING (created_by = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_saved_pallet_builds_updated_at
BEFORE UPDATE ON public.saved_pallet_builds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();