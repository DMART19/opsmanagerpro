import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo } from "react";

export const MAINTENANCE_QUERY_KEY = ["maintenance"];

const fetchMaintenance = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("maintenance_records")
    .select(`
      id, description, maintenance_type, status, scheduled_date, completed_date,
      next_maintenance_date, performed_by, priority, notes, equipment_id, created_at, updated_at,
      equipment:equipment_id (
        id,
        name,
        asset_tag
      )
    `)
    .in("status", ["scheduled", "pending"])
    .order("next_maintenance_date", { ascending: true });

  if (error) {
    if (error.message.includes("JWT") || error.message.includes("LockManager")) return [];
    throw error;
  }
  return data || [];
};

export const useMaintenance = () => {
  const queryClient = useQueryClient();

  const { data: maintenanceRecords = [], isLoading: loading, refetch } = useQuery({
    queryKey: MAINTENANCE_QUERY_KEY,
    queryFn: fetchMaintenance,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    retry: 1,
  });

  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const dueThisWeek = maintenanceRecords.filter((m: any) => {
      if (!m.next_maintenance_date) return false;
      const d = new Date(m.next_maintenance_date);
      return d >= now && d <= oneWeekFromNow;
    }).length;

    const dueNextWeek = maintenanceRecords.filter((m: any) => {
      if (!m.next_maintenance_date) return false;
      const d = new Date(m.next_maintenance_date);
      return d > oneWeekFromNow && d <= twoWeeksFromNow;
    }).length;

    return { dueThisWeek, dueNextWeek };
  }, [maintenanceRecords]);

  useEffect(() => {
    const channel = supabase
      .channel("maintenance_changes_rq")
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_records" }, () => {
        queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUERY_KEY });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return { maintenanceRecords, loading, stats, refetch };
};
