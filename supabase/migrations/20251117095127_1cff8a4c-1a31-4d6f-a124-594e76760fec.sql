-- Enable full replica identity for cases table to support realtime updates
ALTER TABLE public.cases REPLICA IDENTITY FULL;