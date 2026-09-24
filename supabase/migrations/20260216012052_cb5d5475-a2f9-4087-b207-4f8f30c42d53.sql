-- Add recurrence columns to tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_interval integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recurrence_end_date date,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS original_date date,
  ADD COLUMN IF NOT EXISTS recurrence_exceptions date[] DEFAULT '{}';

-- Add index for efficient lookups of recurring tasks and their children
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_parent ON public.tasks(recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_type ON public.tasks(recurrence_type) WHERE recurrence_type != 'none';

-- RLS already covers these columns since they inherit from the existing row policies