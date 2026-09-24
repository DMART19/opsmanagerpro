import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const STAFF_QUERY_KEY = ["staff"];

const fetchStaff = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("staff")
    .select(`
      id, first_name, last_name, email, phone, position, department, hire_date, employment_status, created_at,
      certifications (
        id,
        name,
        expiry_date,
        status
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.message.includes("JWT") || error.message.includes("LockManager")) return [];
    throw error;
  }
  return data || [];
};

export const useStaff = () => {
  const queryClient = useQueryClient();

  const { data: staff = [], isLoading: loading, refetch } = useQuery({
    queryKey: STAFF_QUERY_KEY,
    queryFn: fetchStaff,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    retry: 1,
  });

  useEffect(() => {
    const channel = supabase
      .channel("staff_changes_rq")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff" }, () => {
        queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return { staff, loading, refetch };
};
