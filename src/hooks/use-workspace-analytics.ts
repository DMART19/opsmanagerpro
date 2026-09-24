/**
 * Hook for workspace usage analytics.
 * Supports configurable time ranges (7, 30, 90 days).
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format } from "date-fns";

export interface DailyCount {
  date: string;
  count: number;
}

export interface WorkspaceAnalytics {
  totalAssets: number;
  totalContainers: number;
  totalTeamMembers: number;
  totalTasks: number;
  totalLayouts: number;
  credentialsExpiringSoon: number;

  assetTrend: DailyCount[];
  containerTrend: DailyCount[];
  teamTrend: DailyCount[];
  taskTrend: DailyCount[];

  assetsThisWeek: number;
  assetsPrevWeek: number;
  containersThisWeek: number;
  containersPrevWeek: number;
  teamThisWeek: number;
  teamPrevWeek: number;
  tasksThisWeek: number;
  tasksPrevWeek: number;
}

async function fetchDailyTrend(
  table: string,
  userId: string,
  days: number,
  userIdColumn = "user_id",
  dateColumn = "created_at"
): Promise<DailyCount[]> {
  const since = subDays(new Date(), days).toISOString();
  const { data, error } = await supabase
    .from(table as any)
    .select(dateColumn)
    .eq(userIdColumn, userId)
    .gte(dateColumn, since);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    counts.set(format(subDays(new Date(), i), "yyyy-MM-dd"), 0);
  }
  for (const row of data || []) {
    const d = format(new Date(row[dateColumn]), "yyyy-MM-dd");
    counts.set(d, (counts.get(d) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function countSince(
  table: string, userId: string, since: Date, userIdColumn = "user_id"
): Promise<number> {
  const { count, error } = await supabase
    .from(table as any)
    .select("id", { count: "exact", head: true })
    .eq(userIdColumn, userId)
    .gte("created_at", since.toISOString());
  if (error) throw error;
  return count || 0;
}

async function countBetween(
  table: string, userId: string, from: Date, to: Date, userIdColumn = "user_id"
): Promise<number> {
  const { count, error } = await supabase
    .from(table as any)
    .select("id", { count: "exact", head: true })
    .eq(userIdColumn, userId)
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString());
  if (error) throw error;
  return count || 0;
}

async function countTotal(
  table: string, userId: string, userIdColumn = "user_id"
): Promise<number> {
  const { count, error } = await supabase
    .from(table as any)
    .select("id", { count: "exact", head: true })
    .eq(userIdColumn, userId);
  if (error) throw error;
  return count || 0;
}

async function fetchWorkspaceAnalytics(userId: string, days: number): Promise<WorkspaceAnalytics> {
  const now = new Date();
  const oneWeekAgo = subDays(now, 7);
  const twoWeeksAgo = subDays(now, 14);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    totalAssets, totalContainers, totalTeamMembers, totalTasks, totalLayouts,
    assetTrend, containerTrend, teamTrend, taskTrend,
    assetsThisWeek, assetsPrevWeek,
    containersThisWeek, containersPrevWeek,
    teamThisWeek, teamPrevWeek,
    tasksThisWeek, tasksPrevWeek,
    expiringCredentials,
  ] = await Promise.all([
    countTotal("cache_inventory", userId),
    countTotal("cache_boxes", userId),
    countTotal("employees", userId),
    countTotal("tasks", userId),
    countTotal("saved_trailer_layouts", userId, "created_by"),
    fetchDailyTrend("cache_inventory", userId, days),
    fetchDailyTrend("cache_boxes", userId, days),
    fetchDailyTrend("employees", userId, days),
    fetchDailyTrend("tasks", userId, days),
    countSince("cache_inventory", userId, oneWeekAgo),
    countBetween("cache_inventory", userId, twoWeeksAgo, oneWeekAgo),
    countSince("cache_boxes", userId, oneWeekAgo),
    countBetween("cache_boxes", userId, twoWeeksAgo, oneWeekAgo),
    countSince("employees", userId, oneWeekAgo),
    countBetween("employees", userId, twoWeeksAgo, oneWeekAgo),
    countSince("tasks", userId, oneWeekAgo),
    countBetween("tasks", userId, twoWeeksAgo, oneWeekAgo),
    (async () => {
      const { count } = await supabase
        .from("employee_requirements")
        .select("id, employees!inner(user_id)", { count: "exact", head: true })
        .eq("employees.user_id", userId)
        .eq("status", "Compliant")
        .lte("expire_date", thirtyDaysFromNow.toISOString())
        .gte("expire_date", now.toISOString());
      return count || 0;
    })(),
  ]);

  return {
    totalAssets, totalContainers, totalTeamMembers, totalTasks, totalLayouts,
    credentialsExpiringSoon: expiringCredentials,
    assetTrend, containerTrend, teamTrend, taskTrend,
    assetsThisWeek, assetsPrevWeek,
    containersThisWeek, containersPrevWeek,
    teamThisWeek, teamPrevWeek,
    tasksThisWeek, tasksPrevWeek,
  };
}

export function useWorkspaceAnalytics(days: number = 30) {
  return useQuery({
    queryKey: ["workspace-analytics", days],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Not authenticated");
      return fetchWorkspaceAnalytics(data.user.id, days);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

// ─── Admin: Cross-workspace analytics ───

export interface WorkspaceUsageSummary {
  userId: string;
  email: string | null;
  workspaceName: string | null;
  assetCount: number;
  teamCount: number;
  taskCount: number;
  plan: string | null;
  lastActivity: string | null;
}

export function useAdminWorkspaceUsage() {
  return useQuery({
    queryKey: ["admin-workspace-usage"],
    queryFn: async () => {
      const { data: plans, error: plansError } = await supabase
        .from("workspace_plans")
        .select("user_id, plan, updated_at")
        .order("updated_at", { ascending: false })
        .limit(200);

      if (plansError) throw plansError;
      if (!plans?.length) return [];

      const userIds = plans.map(p => p.user_id);

      const [profilesRes, settingsRes, assetsRes, teamsRes, tasksRes, recentActivityRes] = await Promise.all([
        supabase.from("profiles").select("id, email, display_name").in("id", userIds),
        supabase.from("workspace_settings").select("user_id, workspace_name").in("user_id", userIds),
        supabase.from("cache_inventory").select("user_id").in("user_id", userIds),
        supabase.from("employees").select("user_id").in("user_id", userIds),
        supabase.from("tasks").select("user_id").in("user_id", userIds),
        supabase.from("audit_logs")
          .select("changed_by, changed_at")
          .in("changed_by", userIds)
          .gte("changed_at", subDays(new Date(), 30).toISOString())
          .order("changed_at", { ascending: false })
          .limit(1000),
      ]);

      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
      const settingsMap = new Map((settingsRes.data || []).map(s => [s.user_id, s]));

      const countByUser = (rows: { user_id: string | null }[] | null) => {
        const m = new Map<string, number>();
        for (const r of rows || []) if (r.user_id) m.set(r.user_id, (m.get(r.user_id) || 0) + 1);
        return m;
      };

      const assetCountMap = countByUser(assetsRes.data);
      const teamCountMap = countByUser(teamsRes.data);
      const taskCountMap = countByUser(tasksRes.data);

      const lastActivityMap = new Map<string, string>();
      for (const a of recentActivityRes.data || []) {
        if (a.changed_by && !lastActivityMap.has(a.changed_by)) {
          lastActivityMap.set(a.changed_by, a.changed_at);
        }
      }

      return plans.map(p => {
        const profile = profileMap.get(p.user_id);
        const settings = settingsMap.get(p.user_id);
        return {
          userId: p.user_id,
          email: profile?.email || null,
          workspaceName: settings?.workspace_name || profile?.display_name || null,
          assetCount: assetCountMap.get(p.user_id) || 0,
          teamCount: teamCountMap.get(p.user_id) || 0,
          taskCount: taskCountMap.get(p.user_id) || 0,
          plan: p.plan,
          lastActivity: lastActivityMap.get(p.user_id) || p.updated_at,
        } as WorkspaceUsageSummary;
      });
    },
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });
}
