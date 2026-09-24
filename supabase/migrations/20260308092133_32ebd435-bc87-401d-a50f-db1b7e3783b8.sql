
-- ============================================================
-- SECURITY EVENTS MONITORING TABLE
-- ============================================================

CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  workspace_id uuid,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  ip_address text,
  user_agent text,
  page_route text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast queries
CREATE INDEX idx_security_events_created ON security_events (created_at DESC);
CREATE INDEX idx_security_events_type ON security_events (event_type);
CREATE INDEX idx_security_events_severity ON security_events (severity);
CREATE INDEX idx_security_events_user ON security_events (user_id);

-- RLS: only super_admin can read, system (security definer) can write
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_read_security_events" ON security_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

-- ============================================================
-- LOGGING FUNCTION (called from app or triggers)
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid,
  p_workspace_id uuid,
  p_event_type text,
  p_severity text DEFAULT 'medium',
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_page_route text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO security_events (user_id, workspace_id, event_type, severity, ip_address, user_agent, page_route, details)
  VALUES (p_user_id, p_workspace_id, p_event_type, p_severity, p_ip_address, p_user_agent, p_page_route, p_details)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================
-- ENHANCED has_workspace_permission: log denied access
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_workspace_permission(_workspace_owner_id uuid, _permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID;
  _role TEXT;
  _result BOOLEAN;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN RETURN FALSE; END IF;
  
  -- Workspace owner always has full permission
  IF _user_id = _workspace_owner_id THEN RETURN TRUE; END IF;
  
  -- Get member's role
  SELECT role INTO _role
  FROM public.workspace_members
  WHERE user_id = _user_id
    AND workspace_owner_id = _workspace_owner_id
    AND status = 'active';
  
  IF _role IS NULL THEN
    -- Log unauthorized access attempt (not a member at all)
    PERFORM log_security_event(
      _user_id, _workspace_owner_id, 'failed_authorization',
      'high', NULL, NULL, NULL,
      jsonb_build_object('permission', _permission, 'reason', 'not_a_member')
    );
    RETURN FALSE;
  END IF;
  
  -- Permission matrix
  _result := CASE _role
    WHEN 'workspace_admin' THEN TRUE
    WHEN 'supervisor' THEN _permission IN (
      'view_dashboard','view_assets','create_assets','edit_assets','delete_assets',
      'view_containers','manage_containers','check_in_out',
      'view_credentials','manage_credentials','use_pallet_builder','use_calendar'
    )
    WHEN 'inventory_clerk' THEN _permission IN (
      'view_dashboard','view_assets','create_assets','edit_assets','delete_assets',
      'view_containers','manage_containers','check_in_out'
    )
    WHEN 'safety_manager' THEN _permission IN (
      'view_dashboard','view_team','view_credentials','manage_credentials','view_compliance'
    )
    WHEN 'viewer' THEN _permission IN (
      'view_dashboard','view_assets','view_team'
    )
    ELSE FALSE
  END;

  -- Log denied permission checks
  IF NOT _result THEN
    PERFORM log_security_event(
      _user_id, _workspace_owner_id, 'failed_authorization',
      'medium', NULL, NULL, NULL,
      jsonb_build_object('permission', _permission, 'role', _role, 'reason', 'insufficient_role')
    );
  END IF;

  RETURN _result;
END;
$$;

-- ============================================================
-- DETECT RAPID PERMISSION CHANGES (trigger on workspace_members)
-- ============================================================

CREATE OR REPLACE FUNCTION public.detect_rapid_permission_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_changes int;
BEGIN
  -- Log the role change
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM log_security_event(
      NEW.user_id, NEW.workspace_owner_id, 'role_change',
      'medium', NULL, NULL, NULL,
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role, 'changed_by', auth.uid())
    );

    -- Check for rapid changes (>3 role changes in 10 min for same workspace)
    SELECT COUNT(*) INTO recent_changes
    FROM security_events
    WHERE workspace_id = NEW.workspace_owner_id
      AND event_type = 'role_change'
      AND created_at > now() - interval '10 minutes';

    IF recent_changes >= 3 THEN
      PERFORM log_security_event(
        auth.uid(), NEW.workspace_owner_id, 'rapid_permission_changes',
        'critical', NULL, NULL, NULL,
        jsonb_build_object('changes_in_10min', recent_changes + 1)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_detect_permission_change
  AFTER UPDATE ON workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION detect_rapid_permission_change();

-- ============================================================
-- DETECT BULK DELETION PATTERNS (trigger on cache_inventory soft-delete)
-- ============================================================

CREATE OR REPLACE FUNCTION public.detect_bulk_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_deletes int;
BEGIN
  -- Only fire on soft-delete
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Count recent deletes by same user in 5 minutes
    SELECT COUNT(*) INTO recent_deletes
    FROM cache_inventory
    WHERE deleted_by = NEW.deleted_by
      AND deleted_at > now() - interval '5 minutes';

    IF recent_deletes >= 20 THEN
      PERFORM log_security_event(
        NEW.deleted_by, NEW.user_id, 'unusual_bulk_deletion',
        'high', NULL, NULL, NULL,
        jsonb_build_object('deleted_count_5min', recent_deletes + 1, 'asset_type', NEW.asset_type)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_detect_bulk_deletion
  AFTER UPDATE ON cache_inventory
  FOR EACH ROW
  EXECUTE FUNCTION detect_bulk_deletion();
