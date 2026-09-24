-- Asset Attribute Definitions (workspace-scoped, independent from team attributes)
CREATE TABLE public.asset_attributes (
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

-- Asset Attribute Values (per asset/inventory item)
CREATE TABLE public.asset_attribute_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.cache_inventory(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES public.asset_attributes(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(asset_id, attribute_id)
);

-- Enable Row Level Security
ALTER TABLE public.asset_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_attribute_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_attributes
CREATE POLICY "Users can view their own asset attributes"
  ON public.asset_attributes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own asset attributes"
  ON public.asset_attributes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own asset attributes"
  ON public.asset_attributes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own asset attributes"
  ON public.asset_attributes
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for asset_attribute_values
-- Values are tied to assets, so we check the asset's user_id
CREATE POLICY "Users can view attribute values for their assets"
  ON public.asset_attribute_values
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cache_inventory
      WHERE id = asset_attribute_values.asset_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create attribute values for their assets"
  ON public.asset_attribute_values
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cache_inventory
      WHERE id = asset_attribute_values.asset_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update attribute values for their assets"
  ON public.asset_attribute_values
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.cache_inventory
      WHERE id = asset_attribute_values.asset_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attribute values for their assets"
  ON public.asset_attribute_values
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.cache_inventory
      WHERE id = asset_attribute_values.asset_id
      AND user_id = auth.uid()
    )
  );

-- Indexes for better performance
CREATE INDEX idx_asset_attributes_user_id ON public.asset_attributes(user_id);
CREATE INDEX idx_asset_attributes_sort_order ON public.asset_attributes(user_id, sort_order);
CREATE INDEX idx_asset_attribute_values_asset_id ON public.asset_attribute_values(asset_id);
CREATE INDEX idx_asset_attribute_values_attribute_id ON public.asset_attribute_values(attribute_id);

-- Trigger for updating timestamps
CREATE TRIGGER update_asset_attributes_updated_at
  BEFORE UPDATE ON public.asset_attributes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asset_attribute_values_updated_at
  BEFORE UPDATE ON public.asset_attribute_values
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();