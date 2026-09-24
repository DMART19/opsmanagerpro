import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SystemAnnouncement {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export const useActiveAnnouncements = () => {
  return useQuery({
    queryKey: ["active-announcements"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("system_announcements" as any)
        .select("*")
        .eq("is_active", true)
        .lte("start_date", now)
        .or(`end_date.is.null,end_date.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as unknown as SystemAnnouncement[];
    },
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
    staleTime: 2 * 60 * 1000,
  });
};

export const useAllAnnouncements = () => {
  return useQuery({
    queryKey: ["all-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_announcements" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as SystemAnnouncement[];
    },
  });
};
