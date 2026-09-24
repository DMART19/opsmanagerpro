-- Enable realtime for cache_inventory table so quantity changes sync live
ALTER PUBLICATION supabase_realtime ADD TABLE public.cache_inventory;