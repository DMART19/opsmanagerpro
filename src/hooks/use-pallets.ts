import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Pallet {
  id: string;
  pallet_id: string;
  section_id: string;
  pallet_type: string | null;
  status: string | null;
  condition: string | null;
  current_weight: number | null;
  max_capacity: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const PALLETS_QUERY_KEY = ["pallets"] as const;

const fetchPallets = async (sectionId?: string): Promise<Pallet[]> => {
  const query = supabase
    .from("pallets")
    .select("*")
    .is("deleted_at", null)
    .order("pallet_id", { ascending: true });

  if (sectionId) {
    query.eq("section_id", sectionId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Fire-and-forget access log
  import("@/lib/log-data-access").then(m =>
    m.logDataAccess({ objectType: "pallet_layouts", actionType: "read", metadata: { count: (data || []).length } })
  );

  return data || [];
};

export const usePallets = (sectionId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = sectionId ? [...PALLETS_QUERY_KEY, sectionId] : PALLETS_QUERY_KEY;

  const { data: pallets = [], isLoading: loading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchPallets(sectionId),
    // Long staleTime since realtime subscription below handles invalidation on writes
    staleTime: 1000 * 60 * 5,   // 5 minutes
    gcTime: 1000 * 60 * 15,     // 15 minutes
    retry: 1,
  });

  // Show error toast for real errors
  useEffect(() => {
    if (error && error instanceof Error) {
      toast({
        title: "Error loading pallets",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error]);

  // Realtime subscription: invalidate cache on any DB change instead of re-fetching immediately
  useEffect(() => {
    const channel = supabase
      .channel(`pallets_changes_${sectionId ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pallets" },
        () => {
          queryClient.invalidateQueries({ queryKey: PALLETS_QUERY_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sectionId, queryClient]);

  return { pallets, loading, refetch: async () => { await refetch(); } };
};
