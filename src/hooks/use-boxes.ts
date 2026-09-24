import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTourMode } from "@/contexts/TourModeContext";
import { useDemoDataOptional } from "@/contexts/DemoDataContext";

export interface CacheBox {
  id: string;
  box_number: string;
  box_number_alt: string | null;
  cache_box_type: string;
  status_cache_box: string;
  barcode: string | null;
  box_description: string | null;
  x_group_display: string | null;
  section_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  item_count?: number | null;
  custom_data?: Record<string, any> | null;
  // FK IDs
  container_type_id: string | null;
  container_status_id: string | null;
  container_group_id: string | null;
  warehouse_sections?: {
    section_name: string;
    section_code: string;
  };
}

export interface ContainerItem {
  id: string;
  description: string | null;
  subcategory: string | null;
  quantity_available: number | null;
  status_item: string | null;
}

export interface CacheBoxFile {
  id: string;
  box_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
  uploaded_by: string | null;
}

export const useBoxes = () => {
  const queryClient = useQueryClient();
  const { isTourMode } = useTourMode();
  const demoData = useDemoDataOptional();

  const { data: boxes, isLoading, refetch } = useQuery({
    queryKey: ["cache-boxes"],
    queryFn: async () => {
      // In demo mode, return demo containers
      if (isTourMode && demoData) {
        return demoData.containers.map(c => ({
          ...c,
          warehouse_sections: undefined,
        })) as CacheBox[];
      }
      
      const { data, error } = await supabase.rpc("get_cached_containers_list");

      if (error) throw error;

      const containers = Array.isArray(data) ? (data as any[]) : [];

      return containers.map((box: any) => ({
        ...box,
        cache_box_type: box.cache_box_type ?? "",
        status_cache_box: box.status_cache_box ?? "",
        x_group_display: box.x_group_display ?? null,
        warehouse_sections: box.section_name
          ? {
              section_name: box.section_name,
              section_code: box.section_code,
            }
          : undefined,
      })) as CacheBox[];
    },
    // Realtime subscription below handles invalidation on writes
    staleTime: 1000 * 60 * 5,   // 5 minutes
    gcTime: 1000 * 60 * 15,     // 15 minutes
  });

  // Realtime subscription: invalidate cache on any cache_boxes DB change
  useEffect(() => {
    const channel = supabase
      .channel("cache_boxes_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cache_boxes" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["cache-boxes"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createBox = useMutation({
    mutationFn: async (boxData: Partial<CacheBox>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to create boxes");
      
      // Helper to safely handle optional UUID fields - empty/invalid values become null
      const sanitizeUuid = (value: string | null | undefined): string | null => {
        if (!value || value.trim() === "" || value === "none" || value === "undefined" || value === "null") {
          return null;
        }
        // Basic UUID format validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value) ? value : null;
      };
      
      const insertData: any = {
        box_number: boxData.box_number!,
        box_number_alt: boxData.box_number_alt || null,
        container_type_id: boxData.container_type_id || null,
        container_status_id: boxData.container_status_id || null,
        barcode: boxData.barcode || null,
        box_description: boxData.box_description || null,
        container_group_id: boxData.container_group_id || null,
        section_id: sanitizeUuid(boxData.section_id),
        custom_data: boxData.custom_data || null,
        created_by: user.id,
        user_id: user.id,
      };
      
      const { data, error } = await supabase
        .from("cache_boxes")
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      // Fire-and-forget event tracking
      import("@/lib/track-event").then(m => m.trackEvent("container_created", {
        object_id: data?.id,
        object_name: (data as any)?.box_number || "Container",
      }));
      return data as unknown as CacheBox;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cache-boxes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-all-kpis"] });
      toast({
        title: "Success",
        description: "Box created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateBox = useMutation({
    mutationFn: async ({ id, ...boxData }: Partial<CacheBox> & { id: string }) => {
      // Strip virtual display-only fields that don't exist as DB columns
      const {
        cache_box_type,
        status_cache_box,
        x_group_display,
        warehouse_sections,
        created_at,
        updated_at,
        item_count,
        ...dbFields
      } = boxData as any;

      // Helper to safely handle optional UUID fields
      const sanitizeUuid = (value: string | null | undefined): string | null => {
        if (!value || value.trim() === "" || value === "none" || value === "undefined" || value === "null") {
          return null;
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value) ? value : null;
      };

      const sanitizedData = {
        ...dbFields,
        section_id: dbFields.section_id !== undefined ? sanitizeUuid(dbFields.section_id) : undefined,
      };

      // Remove undefined values to avoid overwriting with undefined
      const cleanData = Object.fromEntries(
        Object.entries(sanitizedData).filter(([_, v]) => v !== undefined)
      );

      const { data, error } = await supabase
        .from("cache_boxes")
        .update(cleanData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Update returned no data — row may not exist or RLS blocked the write.");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cache-boxes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-all-kpis"] });
      queryClient.refetchQueries({ queryKey: ["cache-boxes"] });
      toast({
        title: "Container Updated",
        description: "Changes saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBox = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cache_boxes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cache-boxes"] });
      toast({
        title: "Success",
        description: "Box deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    boxes: boxes || [],
    isLoading,
    createBox,
    updateBox,
    deleteBox,
    refetch,
  };
};

export const useBoxFiles = (boxId: string | null) => {
  const queryClient = useQueryClient();

  const { data: files, isLoading } = useQuery({
    queryKey: ["cache-box-files", boxId],
    queryFn: async () => {
      if (!boxId) return [];
      
      const { data, error } = await supabase
        .from("cache_box_files")
        .select("*")
        .eq("box_id", boxId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return data as CacheBoxFile[];
    },
    enabled: !!boxId,
  });

  const uploadFile = useMutation({
    mutationFn: async ({ file, boxId }: { file: File; boxId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Upload to storage
      const filePath = `${boxId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("box-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create file record
      const { data, error } = await supabase
        .from("cache_box_files")
        .insert([{
          box_id: boxId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          uploaded_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cache-box-files"] });
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFile = useMutation({
    mutationFn: async ({ fileId, filePath }: { fileId: string; filePath: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("box-documents")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete record
      const { error } = await supabase
        .from("cache_box_files")
        .delete()
        .eq("id", fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cache-box-files"] });
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("box-documents")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    files: files || [],
    isLoading,
    uploadFile,
    deleteFile,
    downloadFile,
  };
};

// Hook to fetch items in a container
export const useContainerItems = (containerId: string | null) => {
  const queryClient = useQueryClient();
  const { isTourMode } = useTourMode();
  const demoData = useDemoDataOptional();

  const { data: items, isLoading } = useQuery({
    queryKey: ["container-items", containerId],
    queryFn: async () => {
      if (!containerId) return [];
      
      // In demo mode, filter demo assets by container_id
      if (isTourMode && demoData) {
        return demoData.assets
          .filter(a => a.container_id === containerId)
          .map(a => ({
            id: a.id,
            description: a.description,
            subcategory: a.subcategory,
            quantity_available: a.quantity_available,
            status_item: a.status_item,
          })) as ContainerItem[];
      }
      
      const { data, error } = await supabase
        .from("cache_inventory")
        .select("id, description, quantity_available, category_ref:category_id(name), asset_status:asset_status_id(name)")
        .eq("container_id", containerId)
        .order("description", { ascending: true });

      if (error) throw error;
      return (data || []).map((item: any) => ({
        id: item.id,
        description: item.description,
        subcategory: item.category_ref?.name ?? null,
        quantity_available: item.quantity_available,
        status_item: item.asset_status?.name ?? null,
      })) as ContainerItem[];
    },
    enabled: !!containerId,
  });

  const addItemToContainer = useMutation({
    mutationFn: async ({ 
      itemId, 
      containerId, 
      quantity 
    }: { 
      itemId: string; 
      containerId: string; 
      quantity?: number;
    }) => {
      // First, get the current item to check its quantity
      const { data: item, error: fetchError } = await supabase
        .from("cache_inventory")
        .select("*")
        .eq("id", itemId)
        .single();

      if (fetchError) throw fetchError;
      
      const currentQty = item.quantity_available ?? 0;
      const qtyToAdd = quantity ?? currentQty; // Default to full quantity

      // If adding full quantity, just update container_id
      if (qtyToAdd >= currentQty) {
        const { error } = await supabase
          .from("cache_inventory")
          .update({ container_id: containerId })
          .eq("id", itemId);

        if (error) throw error;
      } else {
        // Partial quantity: split the record
        // 1. Reduce original item's quantity
        const { error: updateError } = await supabase
          .from("cache_inventory")
          .update({ quantity_available: currentQty - qtyToAdd })
          .eq("id", itemId);

        if (updateError) throw updateError;

        // 2. Create new record in container with specified quantity
        // Copy all fields except id, timestamps, and adjust quantity
        const { id, created_at, updated_at, ...itemData } = item;
        const { error: insertError } = await supabase
          .from("cache_inventory")
          .insert({
            ...itemData,
            container_id: containerId,
            quantity_available: qtyToAdd,
            quantity_out: 0, // Reset checkout quantity for split item
          });

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      // Invalidate all related queries for real-time alert accuracy
      queryClient.invalidateQueries({ queryKey: ["container-items"] });
      queryClient.invalidateQueries({ queryKey: ["cache-boxes"] });
      queryClient.invalidateQueries({ queryKey: ["cache-inventory"] });
      toast({
        title: "Item added",
        description: "Item has been added to the container",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeItemFromContainer = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("cache_inventory")
        .update({ container_id: null })
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all related queries for real-time alert accuracy
      queryClient.invalidateQueries({ queryKey: ["container-items"] });
      queryClient.invalidateQueries({ queryKey: ["cache-boxes"] });
      queryClient.invalidateQueries({ queryKey: ["cache-inventory"] });
      toast({
        title: "Item removed",
        description: "Item has been removed from the container",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    items: items || [],
    isLoading,
    addItemToContainer,
    removeItemFromContainer,
  };
};
