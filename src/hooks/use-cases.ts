import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Case {
  id: string;
  case_id: string;
  pallet_id: string;
  case_type: string | null;
  condition: string | null;
  contents: string | null;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  stackable: boolean | null;
  fragile: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const CASES_QUERY_KEY = ["cases"] as const;

const fetchCases = async (palletId?: string, sectionId?: string): Promise<Case[]> => {
  const query = supabase
    .from("cases")
    .select("*")
    .order("case_id", { ascending: true });

  if (palletId) {
    query.eq("pallet_id", palletId);
  } else if (sectionId) {
    // Get cases from pallets in this section
    const { data: palletData } = await supabase
      .from("pallets")
      .select("id")
      .eq("section_id", sectionId);

    if (palletData && palletData.length > 0) {
      const palletIds = palletData.map(p => p.id);
      query.in("pallet_id", palletIds);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
};

export const useCases = (palletId?: string, sectionId?: string) => {
  const queryClient = useQueryClient();

  // Scoped query key: cache separately per pallet / section / all
  const queryKey = palletId
    ? [...CASES_QUERY_KEY, "pallet", palletId]
    : sectionId
    ? [...CASES_QUERY_KEY, "section", sectionId]
    : CASES_QUERY_KEY;

  const { data: cases = [], isLoading: loading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchCases(palletId, sectionId),
    // Long staleTime since realtime subscription below handles invalidation on writes
    staleTime: 1000 * 60 * 5,  // 5 minutes
    gcTime: 1000 * 60 * 15,    // 15 minutes
    retry: 1,
  });

  // Show error toast for real errors
  useEffect(() => {
    if (error && error instanceof Error) {
      toast({
        title: "Error loading cases",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error]);

  // Realtime subscription: invalidate cache on any DB change
  useEffect(() => {
    const channel = supabase
      .channel(`cases_changes_${palletId ?? sectionId ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cases" },
        () => {
          queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [palletId, sectionId, queryClient]);

  return { cases, loading, refetch: async () => { await refetch(); } };
};
