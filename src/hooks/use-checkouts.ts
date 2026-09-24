import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const CHECKOUTS_QUERY_KEY = ["checkouts"];

const fetchCheckouts = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("equipment_checkouts")
    .select(`
      id, equipment_id, staff_id, checked_out_by, checkout_date, due_date, status,
      checkout_notes, purpose, deployment_location, quantity, created_at, updated_at,
      equipment:equipment_id (
        id,
        name,
        asset_tag
      ),
      staff:staff_id (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq("status", "active")
    .order("checkout_date", { ascending: false });

  if (error) {
    if (error.message.includes("JWT") || error.message.includes("LockManager")) return [];
    throw error;
  }
  return data || [];
};

export const useCheckouts = () => {
  const queryClient = useQueryClient();

  const { data: checkouts = [], isLoading: loading, refetch } = useQuery({
    queryKey: CHECKOUTS_QUERY_KEY,
    queryFn: fetchCheckouts,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    retry: 1,
  });

  useEffect(() => {
    const channel = supabase
      .channel("checkouts_changes_rq")
      .on("postgres_changes", { event: "*", schema: "public", table: "equipment_checkouts" }, () => {
        queryClient.invalidateQueries({ queryKey: CHECKOUTS_QUERY_KEY });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return { checkouts, loading, refetch };
};
