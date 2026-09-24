-- Add time columns to tasks table for event scheduling
ALTER TABLE public.tasks 
ADD COLUMN start_time time without time zone DEFAULT NULL,
ADD COLUMN end_time time without time zone DEFAULT NULL;