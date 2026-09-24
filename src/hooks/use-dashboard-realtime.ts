/**
 * Dashboard Realtime Sync
 *
 * Sets up Supabase Realtime subscriptions on all tables that feed
 * dashboard KPI cards. Any INSERT/UPDATE/DELETE on these tables
 * immediately invalidates the corresponding React Query cache,
 * ensuring the dashboard always reflects the latest state.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const WATCHED_TABLES = [
  { table: "cache_inventory",       keys: [["dashboard-all-kpis"], ["cache_inventory"]] },
  { table: "employees",             keys: [["dashboard-all-kpis"]] },
  { table: "employee_requirements", keys: [["dashboard-all-kpis"]] },
  { table: "tasks",                 keys: [["dashboard-all-kpis"]] },
  { table: "requirement_definitions", keys: [["dashboard-all-kpis"]] },
  { table: "maintenance_records",   keys: [["maintenance"]] },
  { table: "item_checkouts",        keys: [["dashboard-all-kpis"], ["cache_inventory"]] },
] as const;

export const useDashboardRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels = WATCHED_TABLES.map(({ table, keys }) =>
      supabase
        .channel(`dashboard_rt_${table}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => {
            keys.forEach((key) =>
              queryClient.invalidateQueries({ queryKey: [...key] })
            );
          }
        )
        .subscribe()
    );

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [queryClient]);
};
