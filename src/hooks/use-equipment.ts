import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo } from "react";

export const EQUIPMENT_QUERY_KEY = ["equipment"];

const fetchEquipment = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("equipment")
    .select("id, name, asset_tag, category, status, condition, serial_number, manufacturer, model, location_in_warehouse, total_quantity, available_quantity, checked_out_quantity, warehouse_id, notes, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    if (error.message.includes("JWT") || error.message.includes("LockManager")) return [];
    throw error;
  }
  return data || [];
};

export const useEquipment = () => {
  const queryClient = useQueryClient();

  const { data: equipment = [], isLoading: loading, refetch } = useQuery({
    queryKey: EQUIPMENT_QUERY_KEY,
    queryFn: fetchEquipment,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    retry: 1,
  });

  const stats = useMemo(() => {
    const total = equipment.length;
    const available = equipment.filter((e: any) => e.status === "available").length;
    const checkedOut = equipment.filter((e: any) => e.status === "checked_out").length;
    const maintenance = equipment.filter((e: any) => e.status === "maintenance").length;
    return { total, available, checkedOut, maintenance };
  }, [equipment]);

  useEffect(() => {
    const channel = supabase
      .channel("equipment_changes_rq")
      .on("postgres_changes", { event: "*", schema: "public", table: "equipment" }, () => {
        queryClient.invalidateQueries({ queryKey: EQUIPMENT_QUERY_KEY });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return { equipment, loading, stats, refetch };
};
