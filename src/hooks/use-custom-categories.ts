import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CustomCategory {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useCustomCategories = () => {
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["custom-categories"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("custom_categories")
        .select("id, name, color, icon, created_by, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CustomCategory[];
    },
    staleTime: 1000 * 60 * 2,  // 2 minutes — taxonomy data rarely changes
    gcTime: 1000 * 60 * 10,
  });

  const createCategory = useMutation({
    mutationFn: async (newCategory: {
      name: string;
      color?: string;
      icon?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("custom_categories")
        .insert([
          {
            ...newCategory,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-categories"] });
      toast.success("Category created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from("custom_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-categories"] });
      toast.success("Category deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });

  return {
    categories: categories || [],
    isLoading,
    createCategory: createCategory.mutate,
    deleteCategory: deleteCategory.mutate,
  };
};
