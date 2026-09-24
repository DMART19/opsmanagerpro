
-- Create workspace_onboarding table for deterministic onboarding state
CREATE TABLE public.workspace_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  asset_created BOOLEAN NOT NULL DEFAULT false,
  container_created BOOLEAN NOT NULL DEFAULT false,
  event_created BOOLEAN NOT NULL DEFAULT false,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  asset_completed_at TIMESTAMPTZ,
  container_completed_at TIMESTAMPTZ,
  event_completed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspace_onboarding ENABLE ROW LEVEL SECURITY;

-- RLS: users can only read/update their own row
CREATE POLICY "Users can read own onboarding"
  ON public.workspace_onboarding FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding"
  ON public.workspace_onboarding FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own onboarding"
  ON public.workspace_onboarding FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Auto-create onboarding row for new users (update handle_new_user or standalone trigger)
CREATE OR REPLACE FUNCTION public.ensure_onboarding_row()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workspace_onboarding (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profiles insert (fires after handle_new_user creates the profile)
CREATE TRIGGER trg_ensure_onboarding_row
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_onboarding_row();

-- Trigger: mark asset_created when item inserted into cache_inventory
CREATE OR REPLACE FUNCTION public.onboarding_mark_asset_created()
RETURNS TRIGGER AS $$
DECLARE
  owner_id UUID;
BEGIN
  -- Get user_id from the inserted record (JSONB safe access)
  owner_id := (to_jsonb(NEW) ->> 'user_id')::UUID;
  IF owner_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  UPDATE public.workspace_onboarding
  SET asset_created = true,
      asset_completed_at = COALESCE(asset_completed_at, now()),
      updated_at = now()
  WHERE user_id = owner_id AND asset_created = false;
  
  -- Check if all complete
  UPDATE public.workspace_onboarding
  SET onboarding_complete = true,
      completed_at = COALESCE(completed_at, now()),
      updated_at = now()
  WHERE user_id = owner_id
    AND asset_created = true
    AND container_created = true
    AND event_created = true
    AND onboarding_complete = false;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_onboarding_asset_created
  AFTER INSERT ON public.cache_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.onboarding_mark_asset_created();

-- Trigger: mark container_created when container inserted into cache_boxes
CREATE OR REPLACE FUNCTION public.onboarding_mark_container_created()
RETURNS TRIGGER AS $$
DECLARE
  owner_id UUID;
BEGIN
  owner_id := (to_jsonb(NEW) ->> 'user_id')::UUID;
  IF owner_id IS NULL THEN
    owner_id := (to_jsonb(NEW) ->> 'created_by')::UUID;
  END IF;
  IF owner_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  UPDATE public.workspace_onboarding
  SET container_created = true,
      container_completed_at = COALESCE(container_completed_at, now()),
      updated_at = now()
  WHERE user_id = owner_id AND container_created = false;
  
  UPDATE public.workspace_onboarding
  SET onboarding_complete = true,
      completed_at = COALESCE(completed_at, now()),
      updated_at = now()
  WHERE user_id = owner_id
    AND asset_created = true
    AND container_created = true
    AND event_created = true
    AND onboarding_complete = false;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_onboarding_container_created
  AFTER INSERT ON public.cache_boxes
  FOR EACH ROW
  EXECUTE FUNCTION public.onboarding_mark_container_created();

-- Trigger: mark event_created when task inserted into tasks
CREATE OR REPLACE FUNCTION public.onboarding_mark_event_created()
RETURNS TRIGGER AS $$
DECLARE
  owner_id UUID;
BEGIN
  owner_id := (to_jsonb(NEW) ->> 'user_id')::UUID;
  IF owner_id IS NULL THEN
    owner_id := (to_jsonb(NEW) ->> 'created_by')::UUID;
  END IF;
  IF owner_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  UPDATE public.workspace_onboarding
  SET event_created = true,
      event_completed_at = COALESCE(event_completed_at, now()),
      updated_at = now()
  WHERE user_id = owner_id AND event_created = false;
  
  UPDATE public.workspace_onboarding
  SET onboarding_complete = true,
      completed_at = COALESCE(completed_at, now()),
      updated_at = now()
  WHERE user_id = owner_id
    AND asset_created = true
    AND container_created = true
    AND event_created = true
    AND onboarding_complete = false;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_onboarding_event_created
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.onboarding_mark_event_created();
