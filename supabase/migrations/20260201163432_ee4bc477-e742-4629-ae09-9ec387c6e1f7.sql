-- Create plan type enum
CREATE TYPE public.workspace_plan AS ENUM ('core', 'pro');

-- Create plan status enum  
CREATE TYPE public.plan_status AS ENUM ('active', 'over_limit', 'read_only');

-- Create workspace_plans table
CREATE TABLE public.workspace_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  plan workspace_plan NOT NULL DEFAULT 'core',
  status plan_status NOT NULL DEFAULT 'active',
  max_assets INTEGER NOT NULL DEFAULT 250,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspace_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own plan"
ON public.workspace_plans
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own plan"
ON public.workspace_plans
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plan"
ON public.workspace_plans
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_workspace_plans_updated_at
BEFORE UPDATE ON public.workspace_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check asset limit
CREATE OR REPLACE FUNCTION public.check_asset_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
  plan_stat plan_status;
BEGIN
  -- Get the user's plan info
  SELECT max_assets, status INTO max_allowed, plan_stat
  FROM public.workspace_plans
  WHERE user_id = NEW.user_id;
  
  -- If no plan exists, use default core limit
  IF max_allowed IS NULL THEN
    max_allowed := 250;
  END IF;
  
  -- Check if plan is read_only
  IF plan_stat = 'read_only' THEN
    RAISE EXCEPTION 'Workspace is in read-only mode. Upgrade to continue.';
  END IF;
  
  -- Count current assets
  SELECT COUNT(*) INTO current_count
  FROM public.equipment
  WHERE user_id = NEW.user_id;
  
  -- Check limit
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Asset limit reached (% / %). Upgrade your plan to add more assets.', current_count, max_allowed;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for asset limit enforcement
CREATE TRIGGER enforce_asset_limit
BEFORE INSERT ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.check_asset_limit();

-- Create function to update plan status based on asset count
CREATE OR REPLACE FUNCTION public.update_plan_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
  current_status plan_status;
BEGIN
  -- Get current plan info
  SELECT max_assets, status INTO max_allowed, current_status
  FROM public.workspace_plans
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  -- If no plan or already read_only, skip
  IF max_allowed IS NULL OR current_status = 'read_only' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Count assets
  SELECT COUNT(*) INTO current_count
  FROM public.equipment
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  -- Update status accordingly
  IF current_count >= max_allowed THEN
    UPDATE public.workspace_plans
    SET status = 'over_limit'
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND status = 'active';
  ELSIF current_count < max_allowed THEN
    UPDATE public.workspace_plans
    SET status = 'active'
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND status = 'over_limit';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update status after asset changes
CREATE TRIGGER update_plan_status_on_asset_change
AFTER INSERT OR DELETE ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.update_plan_status();