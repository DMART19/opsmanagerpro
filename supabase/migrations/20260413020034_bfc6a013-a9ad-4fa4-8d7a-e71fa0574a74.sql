-- Add Stripe columns to workspace_plans
ALTER TABLE public.workspace_plans
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Index for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_workspace_plans_stripe_customer_id
  ON public.workspace_plans (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_workspace_plans_stripe_subscription_id
  ON public.workspace_plans (stripe_subscription_id);