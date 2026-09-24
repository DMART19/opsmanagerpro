-- Create cache_boxes table for FEMA-style box management
CREATE TABLE public.cache_boxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  box_number TEXT NOT NULL,
  box_number_alt TEXT,
  cache_box_type TEXT NOT NULL,
  status_cache_box TEXT NOT NULL DEFAULT 'Available',
  barcode TEXT,
  box_description TEXT,
  x_group_display TEXT,
  section_id UUID REFERENCES public.warehouse_sections(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create cache_box_files table for PDF documentation
CREATE TABLE public.cache_box_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  box_id UUID NOT NULL REFERENCES public.cache_boxes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID
);

-- Enable RLS
ALTER TABLE public.cache_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_box_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cache_boxes
CREATE POLICY "Boxes viewable by all authenticated users"
ON public.cache_boxes
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff and above can manage boxes"
ON public.cache_boxes
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'technician'::app_role) OR
  has_role(auth.uid(), 'staff'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'technician'::app_role) OR
  has_role(auth.uid(), 'staff'::app_role)
);

-- RLS Policies for cache_box_files
CREATE POLICY "Box files viewable by all authenticated users"
ON public.cache_box_files
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff and above can manage box files"
ON public.cache_box_files
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'technician'::app_role) OR
  has_role(auth.uid(), 'staff'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'technician'::app_role) OR
  has_role(auth.uid(), 'staff'::app_role)
);

-- Create storage bucket for box PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('box-documents', 'box-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for box documents
CREATE POLICY "Authenticated users can view box documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'box-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Staff and above can upload box documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'box-documents' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Staff and above can delete box documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'box-documents' AND
  auth.uid() IS NOT NULL
);

-- Add updated_at trigger
CREATE TRIGGER update_cache_boxes_updated_at
BEFORE UPDATE ON public.cache_boxes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_cache_boxes_box_number ON public.cache_boxes(box_number);
CREATE INDEX idx_cache_boxes_barcode ON public.cache_boxes(barcode);
CREATE INDEX idx_cache_boxes_section_id ON public.cache_boxes(section_id);
CREATE INDEX idx_cache_box_files_box_id ON public.cache_box_files(box_id);