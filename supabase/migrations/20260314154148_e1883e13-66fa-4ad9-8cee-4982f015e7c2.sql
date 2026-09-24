
CREATE OR REPLACE FUNCTION public.increment_login_count(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET login_count = COALESCE(login_count, 0) + 1
  WHERE id = p_user_id;
$$;
