CREATE TRIGGER trim_product_events_trigger
AFTER INSERT ON public.product_events
FOR EACH STATEMENT
EXECUTE FUNCTION public.trim_product_events();