import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string | null;
  active: boolean;
}

export const WAREHOUSES_QUERY_KEY = ["warehouses"];

const fetchWarehouses = async (): Promise<Warehouse[]> => {
  const { data, error } = await supabase
    .from("warehouses")
    .select("id, name, code, location, active")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    if (error.message.includes("JWT") || error.message.includes("LockManager")) return [];
    throw error;
  }
  return (data || []) as Warehouse[];
};

export const useWarehouses = () => {
  const { data: warehouses = [], isLoading: loading, refetch } = useQuery({
    queryKey: WAREHOUSES_QUERY_KEY,
    queryFn: fetchWarehouses,
    staleTime: 1000 * 60 * 5, // 5 minutes — rarely changes
    gcTime: 1000 * 60 * 15,
    retry: 1,
  });

  return { warehouses, loading, refetch };
};
