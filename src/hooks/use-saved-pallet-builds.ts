import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PlacedCase } from "@/types/pallet-builder";

export interface SavedPalletBuild {
  id: string;
  name: string;
  is_template: boolean;
  pallet_data: {
    selectedPalletId: string;
    selectedPalletType: "standard" | "custom" | "preset";
    palletDimensions: { width: number; length: number };
    maxWeight: number;
    placedCases: PlacedCase[];
    hasWarnings?: boolean;
    warnings?: string[];
  };
  created_at: string;
  updated_at: string;
}

const SAVED_PALLET_BUILDS_KEY = ["saved_pallet_builds"] as const;

const fetchSavedBuilds = async (): Promise<SavedPalletBuild[]> => {
  const { data, error } = await supabase
    .from("saved_pallet_builds")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[PalletBuilds] Load error:", error);
    throw error;
  }
  return (data || []) as unknown as SavedPalletBuild[];
};

export const useSavedPalletBuilds = () => {
  const queryClient = useQueryClient();
  const { data: savedBuilds = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: SAVED_PALLET_BUILDS_KEY,
    queryFn: fetchSavedBuilds,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    retry: 1,
  });

  useEffect(() => {
    if (error && error instanceof Error) {
      toast.error("Error loading saved pallets", { description: error.message });
    }
  }, [error]);

  const loadSavedBuilds = async () => {
    await refetch();
  };

  const savePalletBuild = async (
    name: string,
    palletData: SavedPalletBuild["pallet_data"],
    isTemplate: boolean = false
  ) => {
    try {
      // Use getSession for local check (faster, no network call)
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      
      if (!user) {
        toast.error("Authentication required", {
          description: "You must be logged in to save pallets",
        });
        return null;
      }

      const { data, error } = await supabase
        .from("saved_pallet_builds")
        .insert({
          name,
          pallet_data: palletData as any,
          created_by: user.id,
          is_template: isTemplate,
        })
        .select()
        .single();

      if (error) throw error;

      // Fire-and-forget event tracking
      import("@/lib/track-event").then(m => m.trackEvent("pallet_saved", {
        object_id: data?.id,
        object_name: name,
      }));

      toast.success(isTemplate ? "Template saved" : "Build saved", {
        description: `"${name}" has been saved${isTemplate ? " as a reusable template" : ""}`,
      });

      queryClient.invalidateQueries({ queryKey: SAVED_PALLET_BUILDS_KEY });
      return data as unknown as SavedPalletBuild;
    } catch (error: any) {
      console.error("Error saving pallet build:", error);
      toast.error("Error saving pallet", {
        description: error.message,
      });
      return null;
    }
  };

  const updatePalletBuild = async (
    id: string,
    name: string,
    palletData: SavedPalletBuild["pallet_data"]
  ) => {
    try {
      const { data, error } = await supabase
        .from("saved_pallet_builds")
        .update({
          name,
          pallet_data: palletData as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Build updated", {
        description: `"${name}" has been saved`,
      });

      queryClient.invalidateQueries({ queryKey: SAVED_PALLET_BUILDS_KEY });
      return data as unknown as SavedPalletBuild;
    } catch (error: any) {
      console.error("Error updating pallet build:", error);
      toast.error("Error updating pallet", {
        description: error.message,
      });
      return null;
    }
  };

  const deleteSavedBuild = async (id: string) => {
    try {
      const { error } = await supabase
        .from("saved_pallet_builds")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Build deleted", {
        description: "Saved build has been removed",
      });

      queryClient.invalidateQueries({ queryKey: SAVED_PALLET_BUILDS_KEY });
    } catch (error: any) {
      console.error("Error deleting saved pallet build:", error);
      toast.error("Error deleting pallet", {
        description: error.message,
      });
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("saved_pallet_builds_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saved_pallet_builds",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: SAVED_PALLET_BUILDS_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    savedBuilds,
    loading,
    savePalletBuild,
    updatePalletBuild,
    deleteSavedBuild,
    refetch: loadSavedBuilds,
  };
};
