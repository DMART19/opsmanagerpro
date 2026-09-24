import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CustomField {
  id: string;
  table_name: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  default_value: string | null;
  validation_rules: any;
  storage_type: string;
  created_at: string;
  updated_at: string;
  sort_order: number;
  is_active: boolean;
  category: string;
  role_ids: string[] | null; // null = applies to all roles
}

export const useCustomFields = (tableName: string) => {
  const queryClient = useQueryClient();

  const { data: customFields = [], isLoading, refetch } = useQuery({
    queryKey: ["custom-fields", tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_fields")
        .select("*")
        .eq("table_name", tableName)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as CustomField[];
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  const createField = useMutation({
    mutationFn: async (field: Partial<CustomField>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const insertData: any = {
        ...field,
        table_name: tableName,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from("custom_fields")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields", tableName] });
      toast({
        title: "Field created",
        description: "New field added to schema",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create field",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateField = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CustomField> }) => {
      const { data, error } = await supabase
        .from("custom_fields")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields", tableName] });
      toast({
        title: "Field updated",
        description: "Field configuration saved",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update field",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteField = useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase
        .from("custom_fields")
        .update({ is_active: false })
        .eq("id", fieldId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields", tableName] });
      toast({
        title: "Field deactivated",
        description: "Field has been removed from schema",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete field",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderFields = useMutation({
    mutationFn: async (fieldIds: string[]) => {
      const updates = fieldIds.map((id, index) => ({
        id,
        sort_order: index + 1,
      }));

      const promises = updates.map(({ id, sort_order }) =>
        supabase
          .from("custom_fields")
          .update({ sort_order })
          .eq("id", id)
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields", tableName] });
      toast({
        title: "Fields reordered",
        description: "Field order updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reorder fields",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    customFields,
    isLoading,
    refetch,
    createField: createField.mutate,
    updateField: updateField.mutate,
    deleteField: deleteField.mutate,
    reorderFields: reorderFields.mutate,
    isCreating: createField.isPending,
    isUpdating: updateField.isPending,
    isDeleting: deleteField.isPending,
  };
};
