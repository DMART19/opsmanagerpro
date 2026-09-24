
-- Trial limit enforcement function
-- Checks if a user is on trial and has exceeded their resource limits
-- Called by per-table triggers on INSERT

CREATE OR REPLACE FUNCTION public.check_trial_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_trial_end timestamptz;
  v_current_count bigint;
  v_limit int;
  v_rec jsonb;
BEGIN
  -- Extract user_id from the new record (supports user_id or created_by)
  v_rec := to_jsonb(NEW);
  IF v_rec ? 'user_id' AND v_rec->>'user_id' IS NOT NULL THEN
    v_user_id := (v_rec->>'user_id')::uuid;
  ELSIF v_rec ? 'created_by' AND v_rec->>'created_by' IS NOT NULL THEN
    v_user_id := (v_rec->>'created_by')::uuid;
  ELSE
    -- No user reference, allow
    RETURN NEW;
  END IF;

  -- Check if user is on trial
  SELECT trial_end_date INTO v_trial_end
  FROM workspace_plans
  WHERE user_id = v_user_id;

  -- Not on trial or trial expired → no trial limits (paid plan limits apply separately)
  IF v_trial_end IS NULL OR v_trial_end <= now() THEN
    RETURN NEW;
  END IF;

  -- Determine limit based on table
  CASE TG_TABLE_NAME
    WHEN 'cache_inventory' THEN
      v_limit := 100;
      SELECT count(*) INTO v_current_count
      FROM cache_inventory WHERE user_id = v_user_id AND deleted_at IS NULL;
    WHEN 'cache_boxes' THEN
      v_limit := 25;
      SELECT count(*) INTO v_current_count
      FROM cache_boxes WHERE user_id = v_user_id;
    WHEN 'pallets' THEN
      v_limit := 20;
      SELECT count(*) INTO v_current_count
      FROM pallets WHERE created_by = v_user_id;
    WHEN 'custom_trailers' THEN
      v_limit := 10;
      SELECT count(*) INTO v_current_count
      FROM custom_trailers WHERE created_by = v_user_id;
    WHEN 'tasks' THEN
      v_limit := 50;
      SELECT count(*) INTO v_current_count
      FROM tasks WHERE user_id = v_user_id;
    WHEN 'employees' THEN
      v_limit := 3;
      SELECT count(*) INTO v_current_count
      FROM employees WHERE user_id = v_user_id AND deleted_at IS NULL;
    ELSE
      RETURN NEW;
  END CASE;

  IF v_current_count >= v_limit THEN
    RAISE EXCEPTION 'Trial limit reached: % allows a maximum of % records (current: %)',
      TG_TABLE_NAME, v_limit, v_current_count;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach triggers to relevant tables
CREATE OR REPLACE TRIGGER check_trial_limit_cache_inventory
  BEFORE INSERT ON cache_inventory
  FOR EACH ROW EXECUTE FUNCTION check_trial_limit();

CREATE OR REPLACE TRIGGER check_trial_limit_cache_boxes
  BEFORE INSERT ON cache_boxes
  FOR EACH ROW EXECUTE FUNCTION check_trial_limit();

CREATE OR REPLACE TRIGGER check_trial_limit_pallets
  BEFORE INSERT ON pallets
  FOR EACH ROW EXECUTE FUNCTION check_trial_limit();

CREATE OR REPLACE TRIGGER check_trial_limit_custom_trailers
  BEFORE INSERT ON custom_trailers
  FOR EACH ROW EXECUTE FUNCTION check_trial_limit();

CREATE OR REPLACE TRIGGER check_trial_limit_tasks
  BEFORE INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION check_trial_limit();

CREATE OR REPLACE TRIGGER check_trial_limit_employees
  BEFORE INSERT ON employees
  FOR EACH ROW EXECUTE FUNCTION check_trial_limit();
