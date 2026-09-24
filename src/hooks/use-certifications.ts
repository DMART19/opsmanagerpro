import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo } from "react";

export const CERTIFICATIONS_QUERY_KEY = ["certifications"];

const fetchCertifications = async (): Promise<any[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("get_cached_credentials_list");

  if (error) {
    if (error.message.includes("JWT") || error.message.includes("LockManager")) return [];
    throw error;
  }

  const certifications = Array.isArray(data) ? (data as any[]) : [];

  // Fire-and-forget access log
  import("@/lib/log-data-access").then(m =>
    m.logDataAccess({ objectType: "credentials", actionType: "read", metadata: { count: certifications.length } })
  );

  return certifications;
};

export const useCertifications = () => {
  const queryClient = useQueryClient();

  const { data: certifications = [], isLoading: loading, refetch } = useQuery<any[]>({
    queryKey: CERTIFICATIONS_QUERY_KEY,
    queryFn: fetchCertifications,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    retry: 1,
  });

  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const total = certifications.length;
    const expiringSoon = certifications.filter((c: any) => {
      if (!c.expiry_date) return false;
      const expiryDate = new Date(c.expiry_date);
      return expiryDate > now && expiryDate <= thirtyDaysFromNow;
    }).length;
    const expired = certifications.filter((c: any) => {
      if (!c.expiry_date) return false;
      return new Date(c.expiry_date) <= now;
    }).length;

    return { total, expiringSoon, expired };
  }, [certifications]);

  useEffect(() => {
    const channel = supabase
      .channel("certifications_changes_rq")
      .on("postgres_changes", { event: "*", schema: "public", table: "certifications" }, () => {
        queryClient.invalidateQueries({ queryKey: CERTIFICATIONS_QUERY_KEY });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return { certifications, loading, stats, refetch };
};
