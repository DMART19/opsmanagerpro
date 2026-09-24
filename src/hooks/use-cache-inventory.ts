import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";


export interface CacheInventoryItem {
  id: string;
  id_cache_fema: string | null;
  id_cache_tf: string | null;
  barcode: string | null;
  section: string | null;
  description: string | null;
  model_part_num: string | null;
  serial_number: string | null;
  date_expire: string | null;
  quantity_out: number;
  quantity_available: number;
  is_internal: boolean;
  group_year: number | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  low_stock_threshold: number | null;
  critical_stock_threshold: number | null;
  container_id: string | null;
  image_url: string | null;
  custom_data?: Record<string, any> | null;
  // FK IDs (item taxonomy)
  manufacturer_id: string | null;
  asset_status_id: string | null;
  asset_group_id: string | null;
  category_id: string | null;
  // FK IDs (container taxonomy)
  container_type_id: string | null;
  container_status_id: string | null;
  container_group_id: string | null;
  // Container-specific fields
  asset_type: "item" | "container";
  box_number: string | null;
  box_number_alt: string | null;
  // Virtual string fields (from joins)
  subcategory: string | null;
  manufacturer: string | null;
  status_item: string | null;
  group_abbv: string | null;
  // Container taxonomy virtual names
  container_type_name: string | null;
  container_status_name: string | null;
  container_group_name: string | null;
  // Unified type flag
  _assetType?: "item" | "container";
  _containerItemCount?: number;
  _containerBoxNumber?: string;
}

// Query key for cache invalidation
export const CACHE_INVENTORY_QUERY_KEY = ["cache_inventory"];

const fetchCacheInventory = async (): Promise<CacheInventoryItem[]> => {
  // Get current user - data is user-scoped via RLS
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase.rpc("get_cached_assets_list");

  if (error) {
    if (!error.message.includes("JWT")) {
      throw error;
    }
    return [];
  }

  const assets = Array.isArray(data) ? (data as any[]) : [];

  // Fire-and-forget access log
  import("@/lib/log-data-access").then(m =>
    m.logDataAccess({
      objectType: "assets",
      actionType: "read",
      metadata: { count: assets.length },
    })
  );

  // Normalize fields for consumers
  return assets.map((item: any) => ({
    ...item,
    asset_type: item.asset_type || "item",
    status_item: item.status_item ?? null,
    manufacturer: item.manufacturer ?? null,
    subcategory: item.subcategory ?? null,
    group_abbv: item.group_abbv ?? null,
    container_type_name: item.container_type_name ?? null,
    container_status_name: item.container_status_name ?? null,
    container_group_name: item.container_group_name ?? null,
    _assetType: item.asset_type || "item",
    _containerBoxNumber: item.box_number ?? null,
  }));
};

export const useCacheInventory = () => {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: CACHE_INVENTORY_QUERY_KEY,
    queryFn: () => fetchCacheInventory(),
    // Realtime subscription below handles cache invalidation on writes,
    // so a long staleTime is safe and avoids redundant network requests.
    staleTime: 1000 * 60 * 5,   // 5 minutes
    gcTime: 1000 * 60 * 15,     // 15 minutes
    // Always refetch on mount to avoid stale counts on cold load
    refetchOnMount: "always",
    retry: 1,
    meta: {
      errorMessage: "Error loading inventory",
    },
  });

  // Show error toast for real errors
  useEffect(() => {
    if (error && error instanceof Error && !error.message.includes("JWT")) {
      toast({
        title: "Error loading inventory",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error]);

  // Note: removed redundant onAuthStateChange listener — React Query's
  // refetchOnWindowFocus + realtime subscription below handle staleness.

  // Set up realtime subscription for cache invalidation
  useEffect(() => {
    const channel = supabase
      .channel("cache_inventory_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cache_inventory",
        },
        () => {
          // Invalidate React Query cache when DB changes
          queryClient.invalidateQueries({ queryKey: CACHE_INVENTORY_QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: ["container-items"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-all-kpis"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { 
    items, 
    loading, 
    error: error instanceof Error ? error : null, 
    refetch 
  };
};

/**
 * Hook to invalidate cache inventory - call after creating/updating/deleting items
 */
export const useInvalidateCacheInventory = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: CACHE_INVENTORY_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["dashboard-all-kpis"] });
  };
};
