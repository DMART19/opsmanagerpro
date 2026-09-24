import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const REQUIREMENTS_QUERY_KEY = ["requirement-definitions"];

const fetchRequirements = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("requirement_definitions")
    .select(`
      *,
      requirement_type_ref:requirement_type_id(name),
      employee_requirements (
        id,
        status,
        expire_date
      )
    `)
    .order("sort_key", { ascending: true, nullsFirst: false });

  if (error) {
    if (error.message.includes("JWT") || error.message.includes("LockManager") || error.message.includes("abort")) return [];
    throw error;
  }

  return (data || []).map((req: any) => {
    const empReqs = req.employee_requirements || [];
    return {
      ...req,
      requirement_type: req.requirement_type_ref?.name || null,
      xTOTotal: empReqs.length,
      xCurrentTotal: empReqs.filter((r: any) => r.status === 'Compliant').length,
      xExpiredTotal: empReqs.filter((r: any) => r.status === 'Expired').length,
      xMissingTotal: empReqs.filter((r: any) => r.status === 'Missing' || r.status === 'Assigned').length,
      xPendingTotal: empReqs.filter((r: any) => r.status === 'Assigned' || r.status === 'Missing').length,
    };
  });
};

export const useRequirements = () => {
  const queryClient = useQueryClient();

  const { data: requirements = [], isLoading: loading, refetch } = useQuery({
    queryKey: REQUIREMENTS_QUERY_KEY,
    queryFn: fetchRequirements,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    retry: 1,
  });

  useEffect(() => {
    const channel = supabase
      .channel("requirements_changes_rq")
      .on("postgres_changes", { event: "*", schema: "public", table: "requirement_definitions" }, () => {
        queryClient.invalidateQueries({ queryKey: REQUIREMENTS_QUERY_KEY });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "employee_requirements" }, () => {
        queryClient.invalidateQueries({ queryKey: REQUIREMENTS_QUERY_KEY });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return { requirements, loading, refetch: refetch as () => void };
};

export const useEmployeeRequirements = (employeeId?: string) => {
  const { data: requirements = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["employee-requirements", employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      const { data, error } = await supabase
        .from("employee_requirements")
        .select(`
          *,
          requirement:requirement_id (
            id,
            title,
            description,
            document_hint,
            requirement_type_ref:requirement_type_id(name)
          ),
          employee:employee_id (
            id,
            first_name,
            last_name,
            employee_id
          )
        `)
        .eq("employee_id", employeeId)
        .order("updated_at", { ascending: false });

      if (error) {
        if (error.message.includes("JWT") || error.message.includes("abort")) return [];
        throw error;
      }
      return data || [];
    },
    enabled: !!employeeId,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    retry: 1,
  });

  return { requirements, loading, refetch: refetch as () => void };
};
