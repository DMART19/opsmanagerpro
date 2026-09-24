import { useQuery, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useEffect, useMemo, useRef } from "react";
import { useAuthUserId } from "@/hooks/use-auth-user";

export const EMPLOYEES_QUERY_KEY = ["employees"];

const TEAM_QUERY_TERMS = [
  "employee",
  "team",
  "credential",
  "requirement",
  "permission",
  "dashboard-all-kpis",
  "activation",
];

const flattenQueryKey = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(flattenQueryKey);
  if (typeof value === "string") return [value.toLowerCase()];
  if (typeof value === "number" || typeof value === "boolean") return [String(value).toLowerCase()];
  if (value && typeof value === "object") return [JSON.stringify(value).toLowerCase()];
  return [];
};

const isTeamQueryKey = (queryKey: QueryKey) => {
  const parts = flattenQueryKey(queryKey);
  return parts.some((part) => TEAM_QUERY_TERMS.some((term) => part.includes(term)));
};

export const invalidateTeamMemberQueries = async (queryClient: QueryClient) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: ["dashboard-all-kpis"] }),
    queryClient.invalidateQueries({
      predicate: (query) => isTeamQueryKey(query.queryKey),
    }),
  ]);

  await queryClient.refetchQueries({ queryKey: EMPLOYEES_QUERY_KEY, type: "active" });
};

/**
 * Deduplicate by ID, keeping the record with the latest updated_at timestamp.
 * Ensures no ghost duplicates appear in the table.
 */
const deduplicateById = (records: any[]): any[] => {
  const byId = new Map<string, any>();
  for (const record of records) {
    const existing = byId.get(record.id);
    if (!existing) {
      byId.set(record.id, record);
    } else {
      // Keep the newer record (race condition protection)
      const existingTs = existing.updated_at || existing.created_at || "";
      const incomingTs = record.updated_at || record.created_at || "";
      if (incomingTs >= existingTs) {
        byId.set(record.id, record);
      }
    }
  }
  return Array.from(byId.values());
};

/**
 * Deterministic sort: created_at DESC, then ID as tiebreaker for stable rendering.
 */
const sortDeterministic = (records: any[]): any[] => {
  return records.sort((a, b) => {
    const tsA = a.created_at || "";
    const tsB = b.created_at || "";
    if (tsB !== tsA) return tsB > tsA ? 1 : -1;
    // Stable tiebreaker by ID
    return (a.id || "").localeCompare(b.id || "");
  });
};

export const fetchEmployees = async (): Promise<any[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("get_cached_team_members_list");

  if (error) {
    if (
      error.message.includes("JWT") ||
      error.message.includes("LockManager") ||
      error.message.includes("abort") ||
      error.message.includes("read-only")
    ) {
      return [];
    }
    throw error;
  }

  const raw = Array.isArray(data) ? (data as any[]) : [];

  // Enterprise pipeline: deduplicate → sort deterministically
  const deduplicated = deduplicateById(raw);
  const employees = sortDeterministic(deduplicated);

  // Fire-and-forget access log
  import("@/lib/log-data-access")
    .then((m) =>
      m.logDataAccess({
        objectType: "team_members",
        actionType: "read",
        metadata: { count: employees.length },
      })
    )
    .catch(() => {
      /* suppress read-only / RLS errors */
    });

  return employees;
};

export const useEmployees = () => {
  const queryClient = useQueryClient();
  const authUserId = useAuthUserId();
  const lastGoodDataRef = useRef<any[]>([]);
  const lastUserIdRef = useRef<string | null>(null);

  // Reset stale data ref when user changes to prevent cross-tenant leakage
  useEffect(() => {
    if (lastUserIdRef.current && lastUserIdRef.current !== authUserId) {
      lastGoodDataRef.current = [];
    }
    lastUserIdRef.current = authUserId;
  }, [authUserId]);

  const {
    data: rawEmployees = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery<any[]>({
    queryKey: EMPLOYEES_QUERY_KEY,
    queryFn: fetchEmployees,
    enabled: !!authUserId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    retry: 1,
  });

  // Memoized normalized employees: deduplicate + sort at render boundary
  const employees = useMemo(() => {
    const processed = sortDeterministic(deduplicateById(rawEmployees));
    if (processed.length > 0) {
      lastGoodDataRef.current = processed;
    }
    return processed;
  }, [rawEmployees]);

  // On error, return last known-good data to prevent empty table
  const safeEmployees = error && employees.length === 0 ? lastGoodDataRef.current : employees;

  // Error toast — suppress transient auth/abort errors
  useEffect(() => {
    if (!error) return;
    const msg = (error as Error).message ?? "";
    if (
      msg.includes("JWT") ||
      msg.includes("LockManager") ||
      msg.includes("abort") ||
      msg.includes("read-only") ||
      (error as any).name === "AbortError"
    )
      return;
    toast({
      title: "Error loading employees",
      description: msg,
      variant: "destructive",
    });
  }, [error]);

  useEffect(() => {
    const invalidateAll = () => {
      void invalidateTeamMemberQueries(queryClient);
    };

    const channel = supabase
      .channel("employees_changes_v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, invalidateAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "employee_requirements" }, invalidateAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { employees: safeEmployees, loading, refetch, error };
};

export const useInvalidateEmployees = () => {
  const queryClient = useQueryClient();
  return async () => {
    await invalidateTeamMemberQueries(queryClient);
  };
};
