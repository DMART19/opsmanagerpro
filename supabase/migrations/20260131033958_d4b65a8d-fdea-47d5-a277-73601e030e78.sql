-- Create tasks table for calendar
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  start_date DATE NOT NULL,
  end_date DATE,
  assigned_to TEXT[],
  location TEXT,
  section TEXT,
  reminder_enabled BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for task access (allow all authenticated users to manage tasks)
CREATE POLICY "Authenticated users can view all tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (true);

-- Allow anonymous access for demo mode
CREATE POLICY "Anonymous users can view tasks"
  ON public.tasks FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create tasks"
  ON public.tasks FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update tasks"
  ON public.tasks FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can delete tasks"
  ON public.tasks FOR DELETE
  TO anon
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();