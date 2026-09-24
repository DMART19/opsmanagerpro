/**
 * Dashboard Stats Fast-Path Hook
 *
 * Purpose: Provide KPI data for the dashboard in <1s with 60-second cache.
 * Strategy:
 *  - Single DB function call (get_dashboard_kpis) returns ALL metrics
 *  - One auth.getUser() call instead of four
 *  - One network round-trip instead of five
 *  - 60-second staleTime so re-visits are instant
 *  - Individual metric hooks still available for backward compat
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────────
interface AssetKpis {
  total: number;
  available: number;
  lowStock: number;
  criticalStock: number;
}

interface TeamKpis {
  total: number;
  compliant: number;
  expiringSoon: number;
  incomplete: number;
}

interface TaskKpis {
  dueThisWeek: number;
  dueNextWeek: number;
}

interface CredentialKpis {
  total: number;
  expiringSoon: number;
  expired: number;
}

interface DashboardKpis {
  assets: AssetKpis;
  team: TeamKpis;
  tasks: TaskKpis;
  credentials: CredentialKpis;
}

// ─── Defaults ───────────────────────────────────────────────────────────
const DEFAULT_ASSETS: AssetKpis = { total: 0, available: 0, lowStock: 0, criticalStock: 0 };
const DEFAULT_TEAM: TeamKpis = { total: 0, compliant: 0, expiringSoon: 0, incomplete: 0 };
const DEFAULT_TASKS: TaskKpis = { dueThisWeek: 0, dueNextWeek: 0 };
const DEFAULT_CREDS: CredentialKpis = { total: 0, expiringSoon: 0, expired: 0 };
const DEFAULT_KPIS: DashboardKpis = { assets: DEFAULT_ASSETS, team: DEFAULT_TEAM, tasks: DEFAULT_TASKS, credentials: DEFAULT_CREDS };

// ─── Batched fetch — single DB round-trip ───────────────────────────────
async function fetchAllKpis(): Promise<DashboardKpis> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_KPIS;

  const { data, error } = await supabase.rpc('get_dashboard_kpis', { p_user_id: user.id });

  if (error) {
    if (error.message.includes("JWT") || error.message.includes("LockManager")) return DEFAULT_KPIS;
    throw error;
  }

  const result = data as unknown as DashboardKpis;
  return {
    assets: result?.assets ?? DEFAULT_ASSETS,
    team: result?.team ?? DEFAULT_TEAM,
    tasks: result?.tasks ?? DEFAULT_TASKS,
    credentials: result?.credentials ?? DEFAULT_CREDS,
  };
}

// ─── Composed hooks ─────────────────────────────────────────────────────
const STALE = 60_000; // 60 seconds
const QUERY_KEY = ["dashboard-all-kpis"] as const;

/**
 * Primary hook — fetches all KPIs in a single request.
 */
export const useDashboardAllKpis = () =>
  useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchAllKpis,
    staleTime: STALE,
    gcTime: STALE * 5,
    retry: 1,
  });

/**
 * Backward-compatible individual hooks — slice from the batched query.
 * These share the same cache entry so there's only ONE network request.
 */
export const useDashboardAssetStats = () => {
  const query = useDashboardAllKpis();
  return {
    ...query,
    data: query.data?.assets ?? DEFAULT_ASSETS,
  };
};

export const useDashboardTeamStats = () => {
  const query = useDashboardAllKpis();
  return {
    ...query,
    data: query.data?.team ?? DEFAULT_TEAM,
  };
};

export const useDashboardTaskStats = () => {
  const query = useDashboardAllKpis();
  return {
    ...query,
    data: query.data?.tasks ?? DEFAULT_TASKS,
  };
};

export const useDashboardCredentialStats = () => {
  const query = useDashboardAllKpis();
  return {
    ...query,
    data: query.data?.credentials ?? DEFAULT_CREDS,
  };
};

/**
 * Aggregate loading state — true only while the single query is still loading.
 */
export const useDashboardReady = () => {
  const { data, isLoading } = useDashboardAllKpis();

  return {
    loading: isLoading,
    assets: { data: data?.assets ?? DEFAULT_ASSETS, loading: isLoading },
    team: { data: data?.team ?? DEFAULT_TEAM, loading: isLoading },
    tasks: { data: data?.tasks ?? DEFAULT_TASKS, loading: isLoading },
    credentials: { data: data?.credentials ?? DEFAULT_CREDS, loading: isLoading },
  };
};
