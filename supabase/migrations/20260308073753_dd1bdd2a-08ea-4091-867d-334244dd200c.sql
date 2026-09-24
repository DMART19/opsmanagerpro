
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  asset_row record;
  emp_row record;
  task_row record;
  
  -- Asset KPIs
  a_total int := 0;
  a_available int := 0;
  a_low_stock int := 0;
  a_critical_stock int := 0;
  
  -- Team KPIs
  t_total int := 0;
  t_compliant int := 0;
  t_expiring int := 0;
  t_incomplete int := 0;
  
  -- Task KPIs
  tk_this_week int := 0;
  tk_next_week int := 0;
  
  -- Credential KPIs
  c_total int := 0;
  c_expiring int := 0;
  c_expired int := 0;
  
  now_ts timestamptz := now();
  one_week timestamptz := now() + interval '7 days';
  two_weeks timestamptz := now() + interval '14 days';
  thirty_days timestamptz := now() + interval '30 days';
  sixty_days timestamptz := now() + interval '60 days';
BEGIN
  -- ── Asset KPIs ──
  FOR asset_row IN
    SELECT ci.quantity_available, ci.low_stock_threshold, ci.critical_stock_threshold,
           ast.name as status_name
    FROM cache_inventory ci
    LEFT JOIN asset_statuses ast ON ast.id = ci.asset_status_id
    WHERE ci.user_id = p_user_id
  LOOP
    a_total := a_total + 1;
    
    -- Check if in-use/service
    IF lower(coalesce(asset_row.status_name, '')) NOT IN (
      'out','in use','assigned','checked out','checked_out','fully checked out',
      'maint','maintenance','under service','service','repair'
    ) THEN
      a_available := a_available + 1;
    END IF;
    
    -- Stock thresholds
    IF coalesce(asset_row.critical_stock_threshold, 0) > 0 
       AND coalesce(asset_row.quantity_available, 0) <= asset_row.critical_stock_threshold THEN
      a_critical_stock := a_critical_stock + 1;
    ELSIF coalesce(asset_row.low_stock_threshold, 0) > 0 
       AND coalesce(asset_row.quantity_available, 0) <= asset_row.low_stock_threshold THEN
      a_low_stock := a_low_stock + 1;
    END IF;
  END LOOP;

  -- ── Team KPIs ──
  FOR emp_row IN
    SELECT e.id,
           count(er.id) as req_count,
           count(CASE WHEN er.status IN ('Missing','Expired') THEN 1 END) as missing_expired,
           count(CASE WHEN er.status = 'Compliant' AND er.expire_date IS NOT NULL 
                       AND er.expire_date > now_ts AND er.expire_date <= sixty_days THEN 1 END) as expiring
    FROM employees e
    LEFT JOIN employee_requirements er ON er.employee_id = e.id
    WHERE e.user_id = p_user_id
    GROUP BY e.id
  LOOP
    t_total := t_total + 1;
    IF emp_row.req_count > 0 THEN
      IF emp_row.missing_expired > 0 THEN
        t_incomplete := t_incomplete + 1;
      ELSIF emp_row.expiring > 0 THEN
        t_expiring := t_expiring + 1;
      ELSE
        t_compliant := t_compliant + 1;
      END IF;
    END IF;
  END LOOP;

  -- ── Task KPIs ──
  FOR task_row IN
    SELECT t.start_date::date as sd
    FROM tasks t
    WHERE t.user_id = p_user_id
      AND t.status IN ('pending','in_progress')
      AND t.start_date::date >= now_ts::date
      AND t.start_date::date <= two_weeks::date
  LOOP
    IF task_row.sd <= one_week::date THEN
      tk_this_week := tk_this_week + 1;
    ELSE
      tk_next_week := tk_next_week + 1;
    END IF;
  END LOOP;

  -- ── Credential KPIs ──
  SELECT count(*) INTO c_total
  FROM requirement_definitions
  WHERE is_active = true;

  SELECT 
    count(CASE WHEN er.status = 'Expired' THEN 1 END),
    count(CASE WHEN er.status = 'Compliant' AND er.expire_date IS NOT NULL 
               AND er.expire_date > now_ts AND er.expire_date <= thirty_days THEN 1 END)
  INTO c_expired, c_expiring
  FROM employee_requirements er
  JOIN employees e ON e.id = er.employee_id
  WHERE e.user_id = p_user_id;

  -- ── Build result ──
  result := jsonb_build_object(
    'assets', jsonb_build_object('total', a_total, 'available', a_available, 'lowStock', a_low_stock, 'criticalStock', a_critical_stock),
    'team', jsonb_build_object('total', t_total, 'compliant', t_compliant, 'expiringSoon', t_expiring, 'incomplete', t_incomplete),
    'tasks', jsonb_build_object('dueThisWeek', tk_this_week, 'dueNextWeek', tk_next_week),
    'credentials', jsonb_build_object('total', c_total, 'expiringSoon', c_expiring, 'expired', c_expired)
  );

  RETURN result;
END;
$function$;
