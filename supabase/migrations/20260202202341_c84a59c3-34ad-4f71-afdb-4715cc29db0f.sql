-- Create in-app notifications table for storing user notifications
CREATE TABLE public.user_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    notification_type text NOT NULL DEFAULT 'info',
    priority text NOT NULL DEFAULT 'normal',
    is_read boolean NOT NULL DEFAULT false,
    is_dismissed boolean NOT NULL DEFAULT false,
    related_entity_type text,
    related_entity_id uuid,
    action_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    read_at timestamp with time zone,
    expires_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.user_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update (mark as read/dismissed) their own notifications
CREATE POLICY "Users can update their own notifications"
ON public.user_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.user_notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Service role can insert notifications (for edge functions)
CREATE POLICY "Service role can insert notifications"
ON public.user_notifications
FOR INSERT
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_unread ON public.user_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_user_notifications_created_at ON public.user_notifications(created_at DESC);

-- Add last_reminder_sent field to tasks table to track when reminders were sent
ALTER TABLE public.tasks 
ADD COLUMN last_reminder_sent timestamp with time zone DEFAULT NULL;