import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CustomTrailer {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  max_weight: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useCustomTrailers = () => {
  const [trailers, setTrailers] = useState<CustomTrailer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrailers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("custom_trailers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTrailers((data || []) as CustomTrailer[]);
    } catch (error: any) {
      console.error("Error loading custom trailers:", error);
      toast({
        title: "Error loading trailers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTrailer = async (trailer: Omit<CustomTrailer, "id" | "created_at" | "updated_at">) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to create trailers",
          variant: "destructive",
        });
        return null;
      }

      const { data, error } = await supabase
        .from("custom_trailers")
        .insert({
          ...trailer,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Trailer created",
        description: `"${trailer.name}" has been created`,
      });

      await loadTrailers();
      return data;
    } catch (error: any) {
      console.error("Error creating trailer:", error);
      toast({
        title: "Error creating trailer",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteTrailer = async (id: string) => {
    try {
      const { error } = await supabase
        .from("custom_trailers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Trailer deleted",
        description: "Trailer has been deleted",
      });

      await loadTrailers();
    } catch (error: any) {
      console.error("Error deleting trailer:", error);
      toast({
        title: "Error deleting trailer",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadTrailers();

    const channel = supabase
      .channel("custom_trailers_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "custom_trailers",
        },
        () => {
          loadTrailers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { trailers, loading, createTrailer, deleteTrailer, refetch: loadTrailers };
};
