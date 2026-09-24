
-- Step 1: Create new enum type
CREATE TYPE public.workspace_plan_v2 AS ENUM ('inventory', 'operations', 'operations_pro');

-- Step 2: Add new column with new enum
ALTER TABLE public.workspace_plans ADD COLUMN plan_v2 public.workspace_plan_v2;

-- Step 3: Migrate existing data
UPDATE public.workspace_plans SET plan_v2 = CASE
  WHEN plan::text = 'core' THEN 'inventory'::public.workspace_plan_v2
  WHEN plan::text = 'pro' THEN 'operations'::public.workspace_plan_v2
  ELSE 'inventory'::public.workspace_plan_v2
END;

-- Step 4: Set NOT NULL and default
ALTER TABLE public.workspace_plans ALTER COLUMN plan_v2 SET NOT NULL;
ALTER TABLE public.workspace_plans ALTER COLUMN plan_v2 SET DEFAULT 'inventory'::public.workspace_plan_v2;

-- Step 5: Drop old column and rename
ALTER TABLE public.workspace_plans DROP COLUMN plan;
ALTER TABLE public.workspace_plans RENAME COLUMN plan_v2 TO plan;

-- Step 6: Drop old enum type
DROP TYPE IF EXISTS public.workspace_plan;

-- Step 7: Rename new enum
ALTER TYPE public.workspace_plan_v2 RENAME TO workspace_plan;

-- Step 8: Update max_assets default for inventory tier
ALTER TABLE public.workspace_plans ALTER COLUMN max_assets SET DEFAULT 1000;

-- Step 9: Add max_team_members column
ALTER TABLE public.workspace_plans ADD COLUMN max_team_members integer NOT NULL DEFAULT 0;

-- Step 10: Set max_team_members based on plan
UPDATE public.workspace_plans SET max_team_members = CASE
  WHEN plan = 'inventory' THEN 0
  WHEN plan = 'operations' THEN 25
  WHEN plan = 'operations_pro' THEN 100
  ELSE 0
END;

-- Step 11: Update max_assets based on plan
UPDATE public.workspace_plans SET max_assets = CASE
  WHEN plan = 'inventory' THEN 1000
  WHEN plan = 'operations' THEN 5000
  WHEN plan = 'operations_pro' THEN 25000
  ELSE 1000
END;
