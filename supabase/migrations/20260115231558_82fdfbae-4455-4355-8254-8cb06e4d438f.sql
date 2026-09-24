-- Create demo_sessions table to track demo sessions
CREATE TABLE public.demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  converted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.demo_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own demo session
CREATE POLICY "Users can view own demo session"
ON public.demo_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Allow insert for authenticated users (including anonymous)
CREATE POLICY "Authenticated users can create demo sessions"
ON public.demo_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own demo session
CREATE POLICY "Users can update own demo session"
ON public.demo_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Add is_demo column to warehouses for easy identification
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Add demo_session_id to track which session owns the warehouse
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS demo_session_id UUID REFERENCES public.demo_sessions(id) ON DELETE CASCADE;

-- Create index for faster demo session lookups
CREATE INDEX idx_demo_sessions_user_id ON public.demo_sessions(user_id);
CREATE INDEX idx_demo_sessions_expires_at ON public.demo_sessions(expires_at);
CREATE INDEX idx_warehouses_is_demo ON public.warehouses(is_demo) WHERE is_demo = true;