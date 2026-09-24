import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface TaskAttribute {
  id: string;
  user_id: string;
  name: string;
  type: "text" | "number" | "date" | "boolean" | "select";
  options: string[] | null;
  required: boolean;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAttributeValue {
  id: string;
  task_id: string;
  attribute_id: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export const useTaskAttributes = () => {
  const queryClient = useQueryClient();

  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ["task-attributes"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        return [];
      }

      const { data, error } = await supabase
        .from("task_attributes")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as TaskAttribute[];
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  const createAttribute = useMutation({
    mutationFn: async (attribute: Omit<TaskAttribute, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("task_attributes")
        .insert(attribute)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-attributes"] });
      toast({
        title: "Success",
        description: "Custom field created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create custom field",
        variant: "destructive",
      });
      console.error("Error creating task attribute:", error);
    },
  });

  const updateAttribute = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TaskAttribute> & { id: string }) => {
      const { data, error } = await supabase
        .from("task_attributes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-attributes"] });
      toast({
        title: "Success",
        description: "Custom field updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update custom field",
        variant: "destructive",
      });
      console.error("Error updating task attribute:", error);
    },
  });

  const deleteAttribute = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("task_attributes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-attributes"] });
      toast({
        title: "Success",
        description: "Custom field deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete custom field",
        variant: "destructive",
      });
      console.error("Error deleting task attribute:", error);
    },
  });

  return {
    attributes,
    isLoading,
    createAttribute,
    updateAttribute,
    deleteAttribute,
  };
};

export const useTaskAttributeValues = (taskId?: string) => {
  const queryClient = useQueryClient();

  const { data: values = [], isLoading } = useQuery({
    queryKey: ["task-attribute-values", taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from("task_attribute_values")
        .select("*")
        .eq("task_id", taskId);

      if (error) throw error;
      return data as TaskAttributeValue[];
    },
    enabled: !!taskId,
  });

  const upsertValues = useMutation({
    mutationFn: async (valuesToUpsert: { task_id: string; attribute_id: string; value: string | null }[]) => {
      if (valuesToUpsert.length === 0) return [];

      const { data, error } = await supabase
        .from("task_attribute_values")
        .upsert(valuesToUpsert, { onConflict: "task_id,attribute_id" })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["task-attribute-values", variables[0].task_id] });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save custom field values",
        variant: "destructive",
      });
      console.error("Error upserting task attribute values:", error);
    },
  });

  return {
    values,
    isLoading,
    upsertValues,
  };
};
