-- Add tags (text array) and custom_data (jsonb) columns to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}';

-- Create an index for tag-based filtering
CREATE INDEX IF NOT EXISTS idx_employees_tags ON public.employees USING GIN (tags);

-- Create an index for custom_data queries
CREATE INDEX IF NOT EXISTS idx_employees_custom_data ON public.employees USING GIN (custom_data);