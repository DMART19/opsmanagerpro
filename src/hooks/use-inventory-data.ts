/**
 * Unified Inventory Hook - Automatically switches between demo and production
 * 
 * In DEMO MODE: Uses in-memory data from DemoDataContext (no database access)
 * In PRODUCTION: Uses real Supabase database via useCacheInventory
 * 
 * This provides a seamless interface for components that works in both modes.
 */

import { useCallback } from "react";
import { useTourMode } from "@/contexts/TourModeContext";
import { useDemoDataOptional, DemoAsset } from "@/contexts/DemoDataContext";
import { useCacheInventory, CacheInventoryItem, CACHE_INVENTORY_QUERY_KEY } from "./use-cache-inventory";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

interface UseInventoryDataResult {
  items: CacheInventoryItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  // CRUD operations
  addItem: (item: Partial<CacheInventoryItem>) => Promise<CacheInventoryItem | null>;
  updateItem: (id: string, updates: Partial<CacheInventoryItem>) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;
  // Mode info
  isDemoMode: boolean;
}

export const useInventoryData = (): UseInventoryDataResult => {
  const { isTourMode } = useTourMode();
  const demoData = useDemoDataOptional();
  const queryClient = useQueryClient();
  
  // Production data (always called but only used when not in demo)
  const { 
    items: prodItems, 
    loading: prodLoading, 
    error: prodError, 
    refetch: prodRefetch 
  } = useCacheInventory();
  
  // Convert demo assets to CacheInventoryItem format
  const demoItems: CacheInventoryItem[] = isTourMode && demoData 
    ? demoData.assets.map(asset => ({
        id: asset.id,
        id_cache_fema: asset.id_cache_fema,
        id_cache_tf: asset.id_cache_tf,
        barcode: asset.barcode,
        section: asset.section,
        description: asset.description,
        model_part_num: asset.model_part_num,
        serial_number: asset.serial_number,
        date_expire: asset.date_expire,
        quantity_out: asset.quantity_out,
        quantity_available: asset.quantity_available,
        is_internal: asset.is_internal,
        group_year: asset.group_year,
        created_at: asset.created_at,
        updated_at: asset.updated_at,
        user_id: asset.user_id,
        low_stock_threshold: asset.low_stock_threshold,
        critical_stock_threshold: asset.critical_stock_threshold,
        container_id: asset.container_id,
        image_url: null,
        custom_data: null,
        manufacturer_id: null,
        asset_status_id: null,
        asset_group_id: null,
        category_id: null,
        container_type_id: null,
        container_status_id: null,
        container_group_id: null,
        asset_type: "item" as const,
        box_number: null,
        box_number_alt: null,
        subcategory: asset.subcategory,
        manufacturer: asset.manufacturer,
        status_item: asset.status_item,
        group_abbv: asset.group_abbv,
        container_type_name: null,
        container_status_name: null,
        container_group_name: null,
      }))
    : [];
  
  // Select data source
  const items = isTourMode ? demoItems : prodItems;
  const loading = isTourMode ? false : prodLoading;
  const error = isTourMode ? null : prodError;
  
  const refetch = useCallback(async () => {
    if (!isTourMode) {
      await prodRefetch();
    }
    // Demo data is reactive, no need to refetch
  }, [isTourMode, prodRefetch]);
  
  // Add item
  const addItem = useCallback(async (itemData: Partial<CacheInventoryItem>): Promise<CacheInventoryItem | null> => {
    if (isTourMode && demoData) {
      // Demo mode: Add to in-memory store
      const newAsset = demoData.addAsset({
        description: itemData.description || null,
        subcategory: itemData.subcategory || null,
        section: itemData.section || null,
        quantity_available: itemData.quantity_available ?? 1,
        quantity_out: itemData.quantity_out ?? 0,
        status_item: itemData.status_item || "Available",
        date_expire: itemData.date_expire || null,
        id_cache_fema: itemData.id_cache_fema || null,
        id_cache_tf: itemData.id_cache_tf || null,
        barcode: itemData.barcode || null,
        serial_number: itemData.serial_number || null,
        manufacturer: itemData.manufacturer || null,
        model_part_num: itemData.model_part_num || null,
        group_abbv: itemData.group_abbv || null,
        group_year: itemData.group_year || null,
        is_internal: itemData.is_internal ?? false,
        image_url: itemData.image_url || null,
        low_stock_threshold: itemData.low_stock_threshold || null,
        critical_stock_threshold: itemData.critical_stock_threshold || null,
        container_id: itemData.container_id || null,
      });
      
      toast({
        title: "Item Added",
        description: `"${itemData.description}" added to demo inventory`,
      });
      
      return {
        id: newAsset.id,
        ...itemData,
        created_at: newAsset.created_at,
        updated_at: newAsset.updated_at,
        user_id: null,
      } as CacheInventoryItem;
    }
    
    // Production mode: Use Supabase
    try {
      enforceRateLimit("asset_create");
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to add items",
          variant: "destructive",
        });
        return null;
      }
      
      const insertPayload = {
        user_id: sessionData.session.user.id,
        description: itemData.description?.trim() || null,
        section: itemData.section?.trim() || null,
        quantity_available: itemData.quantity_available ?? 1,
        quantity_out: itemData.quantity_out ?? 0,
        date_expire: itemData.date_expire || null,
        id_cache_fema: itemData.id_cache_fema?.trim() || null,
        id_cache_tf: itemData.id_cache_tf?.trim() || null,
        barcode: itemData.barcode?.trim() || null,
        serial_number: itemData.serial_number?.trim() || null,
        model_part_num: itemData.model_part_num?.trim() || null,
        group_year: itemData.group_year || null,
        is_internal: itemData.is_internal || false,
        image_url: itemData.image_url || null,
        low_stock_threshold: itemData.low_stock_threshold || null,
        critical_stock_threshold: itemData.critical_stock_threshold || null,
        container_id: itemData.container_id || null,
        // FK IDs
        manufacturer_id: itemData.manufacturer_id || null,
        asset_status_id: itemData.asset_status_id || null,
        asset_group_id: itemData.asset_group_id || null,
        category_id: itemData.category_id || null,
      };

      // Retry once on transient network errors (e.g. Safari "Load failed")
      let data, error;
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await supabase
          .from("cache_inventory")
          .insert([insertPayload])
          .select();
        data = result.data;
        error = result.error;
        if (!error || (error.message && !error.message.includes("Load failed"))) break;
        // Brief pause before retry
        await new Promise(r => setTimeout(r, 500));
      }
      
      if (error) throw error;
      if (!data || data.length === 0) return null;
      
      // Fire-and-forget event tracking
      import("@/lib/track-event").then(m => m.trackEvent("asset_created", {
        object_id: data[0]?.id,
        object_name: itemData.description || "Untitled asset",
      }));
      
      await queryClient.invalidateQueries({ queryKey: CACHE_INVENTORY_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["container-items"] });
      return data[0] as unknown as CacheInventoryItem;
    } catch (err: any) {
      if (err instanceof RateLimitError) {
        toast({
          title: "Rate limit reached",
          description: err.message,
          variant: "destructive",
        });
        return null;
      }
      const isNetworkError = err.message?.includes("Load failed") || err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError");
      toast({
        title: "Failed to Add Item",
        description: isNetworkError 
          ? "Network connection issue. Please check your connection and try again." 
          : (err.message || "An unexpected error occurred."),
        variant: "destructive",
      });
      return null;
    }
  }, [isTourMode, demoData, queryClient]);
  
  // Update item
  const updateItem = useCallback(async (id: string, updates: Partial<CacheInventoryItem>): Promise<boolean> => {
    if (isTourMode && demoData) {
      demoData.updateAsset(id, updates as Partial<DemoAsset>);
      toast({ title: "Item Updated" });
      return true;
    }
    
    try {
      const { error } = await supabase
        .from("cache_inventory")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
      
      await queryClient.invalidateQueries({ queryKey: CACHE_INVENTORY_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["container-items"] });
      return true;
    } catch (err: any) {
      toast({
        title: "Failed to Update Item",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  }, [isTourMode, demoData, queryClient]);
  
  // Delete item (permanent hard delete)
  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    if (isTourMode && demoData) {
      demoData.deleteAsset(id);
      toast({ title: "Item Deleted" });
      return true;
    }
    
    try {
      // First delete any related checkout records to avoid FK constraint
      const { error: checkoutError } = await supabase
        .from("item_checkouts")
        .delete()
        .eq("item_id", id);
      
      if (checkoutError) {
        console.warn("Error deleting related checkouts:", checkoutError.message);
      }
      
      // Also delete any related attribute values
      const { error: attrError } = await supabase
        .from("asset_attribute_values")
        .delete()
        .eq("asset_id", id);
      
      if (attrError) {
        console.warn("Error deleting related attributes:", attrError.message);
      }
      
      // Permanently delete the inventory item
      const { error } = await supabase
        .from("cache_inventory")
        .delete()
        .eq("id", id);
      
      if (error) throw error;

      console.log(`[DELETE] Asset ${id} permanently removed from database`);
      
      // Fire-and-forget event tracking
      import("@/lib/track-event").then(m => m.trackEvent("asset_deleted", { object_id: id }));
      
      await queryClient.invalidateQueries({ queryKey: CACHE_INVENTORY_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["container-items"] });
      return true;
    } catch (err: any) {
      toast({
        title: "Failed to Delete Item",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  }, [isTourMode, demoData, queryClient]);
  
  // Delete multiple items (cascades to related checkouts)
  const deleteItems = useCallback(async (ids: string[]): Promise<boolean> => {
    if (isTourMode && demoData) {
      ids.forEach(id => demoData.deleteAsset(id));
      toast({ title: `${ids.length} Items Deleted` });
      return true;
    }
    
    try {
      // First delete any related checkout records to avoid FK constraint
      const { error: checkoutError } = await supabase
        .from("item_checkouts")
        .delete()
        .in("item_id", ids);
      
      if (checkoutError) {
        console.warn("Error deleting related checkouts:", checkoutError.message);
        // Continue anyway - might not have any checkouts
      }
      
      // Also delete any related attribute values
      const { error: attrError } = await supabase
        .from("asset_attribute_values")
        .delete()
        .in("asset_id", ids);
      
      if (attrError) {
        console.warn("Error deleting related attributes:", attrError.message);
      }
      
      // Permanently delete the inventory items
      const { error } = await supabase
        .from("cache_inventory")
        .delete()
        .in("id", ids);
      
      if (error) throw error;

      console.log(`[DELETE] ${ids.length} assets permanently removed from database`);
      
      await queryClient.invalidateQueries({ queryKey: CACHE_INVENTORY_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["container-items"] });
      return true;
    } catch (err: any) {
      toast({
        title: "Failed to Delete Items",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  }, [isTourMode, demoData, queryClient]);
  
  return {
    items,
    loading,
    error,
    refetch,
    addItem,
    updateItem,
    deleteItem,
    deleteItems,
    isDemoMode: isTourMode,
  };
};
