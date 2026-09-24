CREATE OR REPLACE FUNCTION public.plan_feature_min_tier(p_feature text)
RETURNS public.workspace_plan
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_feature
    -- Inventory (all plans)
    WHEN 'asset_container_crud' THEN 'inventory'
    WHEN 'barcode_qr_scanning' THEN 'inventory'
    WHEN 'csv_import_export' THEN 'inventory'
    -- Team, compliance, tasks, calendar (Operations+)
    WHEN 'team_directory_member_profiles' THEN 'operations'
    WHEN 'credential_definitions_assignment' THEN 'operations'
    WHEN 'credential_expiration_alerts' THEN 'operations'
    WHEN 'add_view_tasks' THEN 'operations'
    WHEN 'calendar_views' THEN 'operations'
    WHEN 'recurring_tasks_drag_drop' THEN 'operations'
    -- Multiple locations start on Operations (2 locations included)
    WHEN 'multi_location' THEN 'operations'
    -- Logistics / layout tools (Logistics Pro+)
    WHEN 'pallet_builder' THEN 'operations_pro'
    WHEN 'trailer_space_planner' THEN 'operations_pro'
    WHEN 'load_intelligence_auto_pack' THEN 'operations_pro'
    WHEN 'save_load_export_layouts' THEN 'operations_pro'
    WHEN 'ai_load_planning' THEN 'operations_pro'
    -- Warehouse Digital Twin (Enterprise only)
    WHEN 'warehouse_twin' THEN 'enterprise'
    ELSE 'operations_pro'
  END::public.workspace_plan;
$$;

REVOKE ALL ON FUNCTION public.plan_feature_min_tier(text) FROM PUBLIC, anon, authenticated;