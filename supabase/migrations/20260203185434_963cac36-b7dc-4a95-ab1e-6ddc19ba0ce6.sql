-- Create admin_messages table for unified internal inbox
CREATE TABLE public.admin_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('feedback', 'bug', 'feature', 'general')),
  message TEXT NOT NULL,
  page_context TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can submit messages
CREATE POLICY "Authenticated users can submit messages"
  ON public.admin_messages
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can view their own messages
CREATE POLICY "Users can view their own messages"
  ON public.admin_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON public.admin_messages
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can update messages (change status, add notes)
CREATE POLICY "Admins can update messages"
  ON public.admin_messages
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_admin_messages_updated_at
  BEFORE UPDATE ON public.admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();