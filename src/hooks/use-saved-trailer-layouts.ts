import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PlacedPallet {
  palletId: string;
  x: number;
  y: number;
  rotation: number;
  palletData: any;
}

export interface SavedTrailerLayout {
  id: string;
  name: string;
  trailer_id: string;
  layout_data: {
    placedPallets: PlacedPallet[];
    totalWeight: number;
    usedSpace: number;
  };
  created_at: string;
  updated_at: string;
}

const SAVED_TRAILER_LAYOUTS_KEY = ["saved_trailer_layouts"] as const;

const fetchLayouts = async (): Promise<SavedTrailerLayout[]> => {
  const { data, error } = await supabase
    .from("saved_trailer_layouts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as SavedTrailerLayout[];
};

export const useSavedTrailerLayouts = () => {
  const queryClient = useQueryClient();
  const { data: layouts = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: SAVED_TRAILER_LAYOUTS_KEY,
    queryFn: fetchLayouts,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    retry: 1,
  });

  useEffect(() => {
    if (error && error instanceof Error) {
      toast({ title: "Error loading layouts", description: error.message, variant: "destructive" });
    }
  }, [error]);

  const loadLayouts = async () => {
    await refetch();
  };

  const saveLayout = async (
    name: string,
    trailerId: string,
    layoutData: SavedTrailerLayout["layout_data"]
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to save layouts",
          variant: "destructive",
        });
        return null;
      }

      const { data, error } = await supabase
        .from("saved_trailer_layouts")
        .insert({
          name,
          trailer_id: trailerId,
          layout_data: layoutData as any,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Layout saved",
        description: `"${name}" has been saved`,
      });

      queryClient.invalidateQueries({ queryKey: SAVED_TRAILER_LAYOUTS_KEY });
      return data as unknown as SavedTrailerLayout;
    } catch (error: any) {
      console.error("Error saving layout:", error);
      toast({
        title: "Error saving layout",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateLayout = async (
    id: string,
    name: string,
    trailerId: string,
    layoutData: SavedTrailerLayout["layout_data"]
  ) => {
    try {
      const { data, error } = await supabase
        .from("saved_trailer_layouts")
        .update({
          name,
          trailer_id: trailerId,
          layout_data: layoutData as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Layout updated",
        description: `"${name}" has been overwritten`,
      });

      queryClient.invalidateQueries({ queryKey: SAVED_TRAILER_LAYOUTS_KEY });
      return data as unknown as SavedTrailerLayout;
    } catch (error: any) {
      console.error("Error updating layout:", error);
      toast({
        title: "Error updating layout",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteLayout = async (id: string) => {
    try {
      const { error } = await supabase
        .from("saved_trailer_layouts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Layout deleted",
        description: "Layout has been deleted",
      });

      queryClient.invalidateQueries({ queryKey: SAVED_TRAILER_LAYOUTS_KEY });
    } catch (error: any) {
      console.error("Error deleting layout:", error);
      toast({
        title: "Error deleting layout",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("saved_trailer_layouts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saved_trailer_layouts",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: SAVED_TRAILER_LAYOUTS_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { layouts, loading, saveLayout, updateLayout, deleteLayout, refetch: loadLayouts };
};
