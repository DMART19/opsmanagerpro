import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCallback } from "react";

export type DeletedItemType = "asset" | "container" | "team_member" | "task" | "pallet" | "credential";

export interface DeletedItem {
  id: string;
  type: DeletedItemType;
  name: string;
  description: string | null;
  deleted_at: string;
  deleted_by_email: string | null;
  days_remaining: number;
  original_data: Record<string, any>;
}

const RETENTION_DAYS = 30;

export const RECENTLY_DELETED_QUERY_KEY = ["recently-deleted"];

const calcDaysRemaining = (deletedAt: string): number => {
  const now = new Date();
  const deletedDate = new Date(deletedAt);
  const daysElapsed = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(RETENTION_DAYS - daysElapsed, 0);
};

const fetchDeletedItems = async (): Promise<DeletedItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const now = new Date();
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all soft-deleted entities in parallel
  const [assetsRes, employeesRes, tasksRes, palletsRes, certsRes] = await Promise.all([
    supabase
      .from("cache_inventory")
      .select("id, description, asset_type, box_number, deleted_at, deleted_by, id_cache_fema, id_cache_tf, container_id, section")
      .not("deleted_at", "is", null)
      .gte("deleted_at", cutoff)
      .order("deleted_at", { ascending: false }),
    supabase
      .from("employees")
      .select("id, first_name, last_name, position, email, deleted_at, deleted_by, department_id")
      .not("deleted_at", "is", null)
      .gte("deleted_at", cutoff)
      .order("deleted_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, title, description, task_type, start_date, deleted_at, deleted_by")
      .not("deleted_at", "is", null)
      .gte("deleted_at", cutoff)
      .order("deleted_at", { ascending: false }),
    supabase
      .from("pallets")
      .select("id, pallet_id, pallet_type, status, deleted_at, deleted_by, section_id")
      .not("deleted_at", "is", null)
      .gte("deleted_at", cutoff)
      .order("deleted_at", { ascending: false }),
    supabase
      .from("certifications")
      .select("id, name, certification_type, staff_id, deleted_at, deleted_by")
      .not("deleted_at", "is", null)
      .gte("deleted_at", cutoff)
      .order("deleted_at", { ascending: false }),
  ]);

  // Collect unique deleted_by user IDs to resolve emails
  const userIds = new Set<string>();
  const addIds = (rows: any[]) => rows?.forEach((r: any) => { if (r.deleted_by) userIds.add(r.deleted_by); });
  addIds(assetsRes.data || []);
  addIds(employeesRes.data || []);
  addIds(tasksRes.data || []);
  addIds(palletsRes.data || []);
  addIds(certsRes.data || []);

  // Resolve emails from profiles
  const emailMap = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", Array.from(userIds));
    (profiles || []).forEach((p: any) => emailMap.set(p.id, p.email));
  }

  const getEmail = (userId: string | null): string | null => {
    if (!userId) return null;
    return emailMap.get(userId) || null;
  };

  const items: DeletedItem[] = [];

  (assetsRes.data || []).forEach((a: any) => {
    items.push({
      id: a.id,
      type: a.asset_type === "container" ? "container" : "asset",
      name: a.description || a.box_number || a.id_cache_fema || "Unnamed",
      description: a.id_cache_tf || a.id_cache_fema || null,
      deleted_at: a.deleted_at,
      deleted_by_email: getEmail(a.deleted_by),
      days_remaining: calcDaysRemaining(a.deleted_at),
      original_data: a,
    });
  });

  (employeesRes.data || []).forEach((e: any) => {
    items.push({
      id: e.id,
      type: "team_member",
      name: `${e.first_name} ${e.last_name}`.trim(),
      description: e.position || e.email || null,
      deleted_at: e.deleted_at,
      deleted_by_email: getEmail(e.deleted_by),
      days_remaining: calcDaysRemaining(e.deleted_at),
      original_data: e,
    });
  });

  (tasksRes.data || []).forEach((t: any) => {
    items.push({
      id: t.id,
      type: "task",
      name: t.title,
      description: t.task_type || t.description || null,
      deleted_at: t.deleted_at,
      deleted_by_email: getEmail(t.deleted_by),
      days_remaining: calcDaysRemaining(t.deleted_at),
      original_data: t,
    });
  });

  (palletsRes.data || []).forEach((p: any) => {
    items.push({
      id: p.id,
      type: "pallet",
      name: p.pallet_id,
      description: p.pallet_type || p.status || null,
      deleted_at: p.deleted_at,
      deleted_by_email: getEmail(p.deleted_by),
      days_remaining: calcDaysRemaining(p.deleted_at),
      original_data: p,
    });
  });

  (certsRes.data || []).forEach((c: any) => {
    items.push({
      id: c.id,
      type: "credential",
      name: c.name,
      description: c.certification_type || null,
      deleted_at: c.deleted_at,
      deleted_by_email: getEmail(c.deleted_by),
      days_remaining: calcDaysRemaining(c.deleted_at),
      original_data: c,
    });
  });

  // Sort by deleted_at desc
  items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
  return items;
};

const TABLE_MAP: Record<DeletedItemType, string> = {
  asset: "cache_inventory",
  container: "cache_inventory",
  team_member: "employees",
  task: "tasks",
  pallet: "pallets",
  credential: "certifications",
};

const INVALIDATE_KEYS: Record<DeletedItemType, string[]> = {
  asset: ["cache_inventory"],
  container: ["cache_inventory"],
  team_member: ["employees"],
  task: ["tasks"],
  pallet: ["pallets_changes", "active-pallets-extended"],
  credential: ["certifications"],
};

export const useRecentlyDeleted = () => {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: RECENTLY_DELETED_QUERY_KEY,
    queryFn: fetchDeletedItems,
    staleTime: 1000 * 30,
  });

  const restoreItem = useCallback(async (item: DeletedItem): Promise<boolean> => {
    try {
      const table = TABLE_MAP[item.type];
      const { data, error } = await supabase.rpc("restore_soft_deleted", {
        p_table: table,
        p_id: item.id,
      });

      if (error) throw error;

      toast({
        title: "Item restored",
        description: `${item.name} has been restored successfully.`,
      });

      queryClient.invalidateQueries({ queryKey: RECENTLY_DELETED_QUERY_KEY });
      for (const key of INVALIDATE_KEYS[item.type]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      // Also refresh dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-all-kpis"] });
      return true;
    } catch (err: any) {
      toast({
        title: "Restore failed",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  }, [queryClient]);

  const permanentlyDelete = useCallback(async (item: DeletedItem): Promise<boolean> => {
    try {
      if (item.type === "team_member") {
        await supabase.from("employee_requirements").delete().eq("employee_id", item.id);
        const { error } = await supabase.from("employees").delete().eq("id", item.id);
        if (error) throw error;
      } else if (item.type === "asset" || item.type === "container") {
        await supabase.from("asset_attribute_values").delete().eq("asset_id", item.id);
        await supabase.from("item_checkouts").delete().eq("item_id", item.id);
        const { error } = await supabase.from("cache_inventory").delete().eq("id", item.id);
        if (error) throw error;
      } else if (item.type === "task") {
        const { error } = await supabase.from("tasks").delete().eq("id", item.id);
        if (error) throw error;
      } else if (item.type === "pallet") {
        await supabase.from("items").delete().eq("pallet_id", item.id);
        await supabase.from("cases").delete().eq("pallet_id", item.id);
        const { error } = await supabase.from("pallets").delete().eq("id", item.id);
        if (error) throw error;
      } else if (item.type === "credential") {
        const { error } = await supabase.from("certifications").delete().eq("id", item.id);
        if (error) throw error;
      }

      toast({
        title: "Permanently deleted",
        description: `${item.name} has been permanently removed.`,
      });

      queryClient.invalidateQueries({ queryKey: RECENTLY_DELETED_QUERY_KEY });
      return true;
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  }, [queryClient]);

  const clearAll = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Permanently delete all soft-deleted records for this user across all tables
      const results = await Promise.all([
        // Delete asset attribute values for soft-deleted assets first
        supabase.rpc("clear_all_soft_deleted" as any, { p_user_id: user.id }),
      ]);

      // Fallback: delete directly if RPC doesn't exist
      const rpcError = results[0]?.error;
      if (rpcError) {
        // Manual deletion across tables
        const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
        
        // Get IDs of soft-deleted assets for cleanup
        const { data: deletedAssets } = await supabase
          .from("cache_inventory")
          .select("id")
          .not("deleted_at", "is", null)
          .eq("user_id", user.id);
        
        const assetIds = (deletedAssets || []).map((a: any) => a.id);
        
        if (assetIds.length > 0) {
          await supabase.from("asset_attribute_values").delete().in("asset_id", assetIds);
          await supabase.from("item_checkouts").delete().in("item_id", assetIds);
        }

        // Get IDs of soft-deleted employees
        const { data: deletedEmps } = await supabase
          .from("employees")
          .select("id")
          .not("deleted_at", "is", null)
          .eq("user_id", user.id);
        
        const empIds = (deletedEmps || []).map((e: any) => e.id);
        if (empIds.length > 0) {
          await supabase.from("employee_requirements").delete().in("employee_id", empIds);
        }

        // Get IDs of soft-deleted pallets
        const { data: deletedPallets } = await (supabase as any)
          .from("pallets")
          .select("id")
          .not("deleted_at", "is", null)
          .eq("user_id", user.id);
        
        const palletIds = (deletedPallets || []).map((p: any) => p.id);
        if (palletIds.length > 0) {
          await supabase.from("items").delete().in("pallet_id", palletIds);
          await supabase.from("cases").delete().in("pallet_id", palletIds);
        }

        // Now delete the main records
        await Promise.all([
          (supabase as any).from("cache_inventory").delete().not("deleted_at", "is", null).eq("user_id", user.id),
          (supabase as any).from("employees").delete().not("deleted_at", "is", null).eq("user_id", user.id),
          (supabase as any).from("tasks").delete().not("deleted_at", "is", null).eq("user_id", user.id),
          (supabase as any).from("pallets").delete().not("deleted_at", "is", null).eq("user_id", user.id),
          (supabase as any).from("certifications").delete().not("deleted_at", "is", null).eq("created_by", user.id),
        ]);
      }

      toast({
        title: "Trash cleared",
        description: "All deleted items have been permanently removed.",
      });

      queryClient.invalidateQueries({ queryKey: RECENTLY_DELETED_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard-all-kpis"] });
      return true;
    } catch (err: any) {
      toast({
        title: "Clear failed",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  }, [queryClient]);

  return { items, isLoading, refetch, restoreItem, permanentlyDelete, clearAll };
};
