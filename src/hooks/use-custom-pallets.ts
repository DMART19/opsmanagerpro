import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CustomPallet {
  id: string;
  name: string;
  width: number;
  length: number;
  height: number | null;
  max_weight: number;
  pallet_type: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useCustomPallets = () => {
  const [customPallets, setCustomPallets] = useState<CustomPallet[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCustomPallets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("custom_pallets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCustomPallets(data || []);
    } catch (error: any) {
      console.error("Error loading custom pallets:", error);
      toast.error("Failed to load custom pallets");
    } finally {
      setLoading(false);
    }
  };

  const createCustomPallet = async (pallet: {
    name: string;
    width: number;
    length: number;
    height?: number;
    max_weight: number;
    pallet_type: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to create custom pallets");
        return null;
      }

      const { data, error } = await supabase
        .from("custom_pallets")
        .insert([{ ...pallet, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Custom pallet created successfully");
      await loadCustomPallets();
      return data;
    } catch (error: any) {
      console.error("Error creating custom pallet:", error);
      toast.error("Failed to create custom pallet");
      return null;
    }
  };

  const deleteCustomPallet = async (id: string) => {
    try {
      const { error } = await supabase
        .from("custom_pallets")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Custom pallet deleted");
      await loadCustomPallets();
    } catch (error: any) {
      console.error("Error deleting custom pallet:", error);
      toast.error("Failed to delete custom pallet");
    }
  };

  useEffect(() => {
    loadCustomPallets();
  }, []);

  return { customPallets, loading, refetch: loadCustomPallets, createCustomPallet, deleteCustomPallet };
};
