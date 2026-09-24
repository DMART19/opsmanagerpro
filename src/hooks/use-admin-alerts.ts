import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface AdminAlert {
  id: string;
  trigger_type: "error_spike" | "endpoint_failure" | "auth_failure";
  top_error: string;
  top_error_hash: string | null;
  hit_count: number;
  details: Record<string, any> | null;
  status: "active" | "dismissed";
  dismissed_at: string | null;
  dismissed_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useAdminAlerts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_alerts" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as AdminAlert[];
    },
    staleTime: 15_000,
    gcTime: 60_000, // 1 minute
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-alerts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_alerts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

export function useDismissAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_alerts" as any)
        .update({ status: "dismissed", dismissed_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
    },
  });
}

export function useCheckSpikes() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("check_error_spikes" as any);
      if (error) throw error;
      return data;
    },
  });
}
