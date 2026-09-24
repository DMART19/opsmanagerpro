/**
 * Navigation Prefetch Hook
 * 
 * Prefetches both data AND lazy-loaded components for navigation targets
 * on hover/focus to make page transitions feel instant.
 * 
 * Uses the ACTUAL query keys and fetch functions from hooks so prefetched
 * data populates the real React Query cache entries.
 * 
 * Also supports login-time background prefetch of commonly visited pages
 * so the first navigation after login feels instant.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTourMode } from '@/contexts/TourModeContext';
import { CACHE_INVENTORY_QUERY_KEY } from '@/hooks/use-cache-inventory';
import { EMPLOYEES_QUERY_KEY, fetchEmployees } from '@/hooks/use-employees';
import { CHECKOUTS_QUERY_KEY } from '@/hooks/use-checkouts';
import { MAINTENANCE_QUERY_KEY } from '@/hooks/use-maintenance';
import { REQUIREMENTS_QUERY_KEY } from '@/hooks/use-requirements';

// ─── Lazy component preloaders ─────────────────────────────────────
// Triggers the same import() as App.tsx so the chunk is shared
const componentPreloaders: Record<string, () => void> = {
  '/dashboard': () => { import('@/pages/Index'); },
  '/inventory': () => { import('@/pages/Inventory'); },
  '/inventory/add': () => { import('@/pages/AddEquipment'); },
  '/people': () => { import('@/pages/People'); },
  '/calendar': () => { import('@/pages/Calendar'); },
  '/settings': () => { import('@/pages/Settings'); },
  '/pallet-builder': () => { import('@/pages/PalletBuilder'); },
  '/trailer-builder': () => { import('@/pages/TrailerBuilder'); },
  '/billing': () => { import('@/pages/Billing'); },
  '/help': () => { import('@/pages/HelpCenter'); },
};

// ─── Data prefetch configs ─────────────────────────────────────────
// Each uses the ACTUAL query key so data is reused by the real hooks
const PREFETCH_CONFIGS: Record<string, Array<{
  key: readonly string[];
  fn: () => Promise<any>;
}>> = {
  '/dashboard': [
    {
      // Single batched KPI query — replaces 4+ individual queries
      key: ['dashboard-all-kpis'] as const,
      fn: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data } = await supabase.rpc('get_dashboard_kpis', { p_user_id: user.id });
        return data;
      },
    },
    {
      key: CHECKOUTS_QUERY_KEY,
      fn: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data } = await supabase
          .from('equipment_checkouts')
          .select('id, equipment_id, staff_id, checkout_date, due_date, status, quantity')
          .order('checkout_date', { ascending: false })
          .limit(200);
        return data || [];
      },
    },
    {
      key: MAINTENANCE_QUERY_KEY,
      fn: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data } = await supabase
          .from('maintenance_records')
          .select('id, equipment_id, maintenance_type, status, scheduled_date, completed_date, priority')
          .order('scheduled_date', { ascending: false })
          .limit(200);
        return data || [];
      },
    },
  ],
  '/inventory': [
    {
      key: CACHE_INVENTORY_QUERY_KEY,
      fn: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data } = await supabase
          .from('cache_inventory')
          .select(`
            id, id_cache_fema, id_cache_tf, barcode, section, description, model_part_num, serial_number,
            date_expire, quantity_out, quantity_available, is_internal, group_year, created_at, updated_at,
            user_id, low_stock_threshold, critical_stock_threshold, container_id, image_url, custom_data,
            manufacturer_id, asset_status_id, asset_group_id, category_id,
            container_type_id, container_status_id, container_group_id,
            asset_type, box_number, box_number_alt,
            asset_status:asset_status_id(id,name), manufacturer_ref:manufacturer_id(id,name), category_ref:category_id(id,name), asset_group_ref:asset_group_id(id,name), container_type_ref:container_type_id(id,name), container_status_ref:container_status_id(id,name), container_group_ref:container_group_id(id,name)
          `)
          .order('created_at', { ascending: false })
          .range(0, 9999);
        return (data || []).map((item: any) => ({
          ...item,
          asset_type: item.asset_type || 'item',
          status_item: item.asset_status?.name ?? null,
          manufacturer: item.manufacturer_ref?.name ?? null,
          subcategory: item.category_ref?.name ?? null,
          group_abbv: item.asset_group_ref?.name ?? null,
          container_type_name: item.container_type_ref?.name ?? null,
          container_status_name: item.container_status_ref?.name ?? null,
          container_group_name: item.container_group_ref?.name ?? null,
          _assetType: item.asset_type || 'item',
          _containerBoxNumber: item.box_number ?? null,
        }));
      },
    },
    {
      // Containers list — shared with the Containers tab on inventory page
      key: ['cache-boxes'] as const,
      fn: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data } = await supabase
          .from('cache_boxes')
          .select('id, box_number, box_number_alt, barcode, box_description, item_count, container_type_id, container_status_id, container_group_id, section_id, image_url, created_at, updated_at, user_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(500);
        return data || [];
      },
    },
  ],
  '/people': [
    {
      key: EMPLOYEES_QUERY_KEY,
      fn: fetchEmployees,
    },
    {
      key: REQUIREMENTS_QUERY_KEY,
      fn: async () => {
        const { data } = await supabase
          .from('requirement_definitions')
          .select('id, title, is_active')
          .order('sort_key', { ascending: true, nullsFirst: false });
        return data || [];
      },
    },
  ],
  '/calendar': [
    {
      key: ['tasks'] as const,
      fn: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data } = await supabase
          .from('tasks')
          .select('id, title, description, task_type, priority, status, start_date, end_date, start_time, end_time, assigned_to, location, section, reminder_enabled, created_by, user_id, created_at, updated_at, recurrence_type, recurrence_interval, recurrence_end_date, recurrence_parent_id, original_date, recurrence_exceptions')
          .order('start_date', { ascending: true });
        return data || [];
      },
    },
  ],
};

// ─── Tracking sets ─────────────────────────────────────────────────
const preloadedComponents = new Set<string>();
let preloadedData = new Set<string>();
setInterval(() => { preloadedData = new Set<string>(); }, 60_000);

// Routes to prefetch immediately after login (in priority order)
const LOGIN_PREFETCH_ROUTES = ['/dashboard', '/inventory', '/people'];

export const useNavigationPrefetch = () => {
  const queryClient = useQueryClient();
  const { isTourMode } = useTourMode();

  const prefetchRoute = useCallback((route: string) => {
    const normalizedRoute = route.replace('/demo', '');

    // 1. Preload lazy component (always, even in demo)
    if (!preloadedComponents.has(normalizedRoute) && componentPreloaders[normalizedRoute]) {
      preloadedComponents.add(normalizedRoute);
      componentPreloaders[normalizedRoute]();
    }

    // 2. Prefetch data (skip in demo mode)
    if (isTourMode) return;
    if (preloadedData.has(normalizedRoute)) return;

    const configs = PREFETCH_CONFIGS[normalizedRoute];
    if (!configs) return;

    preloadedData.add(normalizedRoute);

    configs.forEach(({ key, fn }) => {
      const queryState = queryClient.getQueryState([...key]);
      const isStale = !queryState ||
        queryState.isInvalidated ||
        (queryState.dataUpdatedAt && Date.now() - queryState.dataUpdatedAt > 60_000);

      if (isStale) {
        queryClient.prefetchQuery({
          queryKey: [...key],
          queryFn: fn,
          staleTime: 60_000,
        });
      }
    });
  }, [queryClient, isTourMode]);

  return { prefetchRoute };
};

/**
 * Hook to prefetch commonly visited pages after login.
 * Call once in the authenticated layout. Fires with a delay
 * so it doesn't compete with the current page's data fetches.
 */
export const useLoginPrefetch = () => {
  const { prefetchRoute } = useNavigationPrefetch();
  const { isTourMode } = useTourMode();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current || isTourMode) return;
    didRun.current = true;

    // Stagger prefetch: wait 2s for current page to finish loading,
    // then prefetch each route 500ms apart to avoid request bursts
    const timers: ReturnType<typeof setTimeout>[] = [];
    LOGIN_PREFETCH_ROUTES.forEach((route, i) => {
      timers.push(setTimeout(() => prefetchRoute(route), 2000 + i * 500));
    });

    return () => timers.forEach(clearTimeout);
  }, [prefetchRoute, isTourMode]);
};
