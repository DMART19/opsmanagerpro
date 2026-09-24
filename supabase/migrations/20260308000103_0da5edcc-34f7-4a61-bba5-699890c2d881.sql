
-- Security definer function to repair missing workspace records on login
CREATE OR REPLACE FUNCTION public.ensure_workspace_integrity(p_user_id UUID)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure workspace_plans exists
  INSERT INTO public.workspace_plans (
    user_id, plan, status, max_assets, max_team_members,
    workspace_status, trial_start_date, trial_end_date
  )
  VALUES (
    p_user_id, 'inventory', 'trial', 1000, 5,
    'active', now(), now() + interval '14 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Ensure workspace_settings exists
  INSERT INTO public.workspace_settings (user_id, subscription_status, trial_started_at, trial_ends_at)
  VALUES (p_user_id, 'trialing', now(), now() + interval '14 days')
  ON CONFLICT (user_id) DO NOTHING;

  -- Ensure workspace_members has owner as workspace_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_owner_id = p_user_id AND user_id = p_user_id
  ) THEN
    INSERT INTO public.workspace_members (workspace_owner_id, user_id, role, status)
    VALUES (p_user_id, p_user_id, 'workspace_admin', 'active');
  END IF;
END;
$$;
