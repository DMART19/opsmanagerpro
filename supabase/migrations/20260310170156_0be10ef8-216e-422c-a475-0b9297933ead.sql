
-- data_access_logs: missing workspace_id and action_type composite indexes
CREATE INDEX IF NOT EXISTS idx_data_access_logs_workspace ON public.data_access_logs USING btree (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_action_type ON public.data_access_logs USING btree (action_type, created_at DESC);

-- error_logs: missing workspace_id index
CREATE INDEX IF NOT EXISTS idx_error_logs_workspace ON public.error_logs USING btree (workspace_id, created_at DESC);

-- product_events: missing workspace_id index
CREATE INDEX IF NOT EXISTS idx_product_events_workspace ON public.product_events USING btree (workspace_id, created_at DESC);

-- snapshot_audit_logs: no indexes at all besides PK
CREATE INDEX IF NOT EXISTS idx_snapshot_audit_workspace ON public.snapshot_audit_logs USING btree (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshot_audit_action ON public.snapshot_audit_logs USING btree (action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshot_audit_created ON public.snapshot_audit_logs USING btree (created_at DESC);
