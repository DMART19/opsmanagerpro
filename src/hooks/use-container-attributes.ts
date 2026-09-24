import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ContainerAttribute {
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

export interface ContainerAttributeValue {
  id: string;
  container_id: string;
  attribute_id: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export const useContainerAttributes = () => {
  const queryClient = useQueryClient();

  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ["container-attributes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("container_attributes")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as ContainerAttribute[];
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  const createAttribute = useMutation({
    mutationFn: async (input: {
      name: string;
      type: ContainerAttribute["type"];
      options?: string[];
      required?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("container_attributes")
        .insert({
          user_id: user.id,
          name: input.name,
          type: input.type,
          options: input.options || null,
          required: input.required || false,
          sort_order: attributes.length,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["container-attributes"] });
      toast.success("Attribute created");
    },
    onError: (error) => {
      toast.error("Failed to create attribute: " + error.message);
    },
  });

  const updateAttribute = useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      type?: ContainerAttribute["type"];
      options?: string[];
      required?: boolean;
    }) => {
      const { id, ...updates } = input;
      const { error } = await supabase
        .from("container_attributes")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["container-attributes"] });
      toast.success("Attribute updated");
    },
    onError: (error) => {
      toast.error("Failed to update attribute: " + error.message);
    },
  });

  const deleteAttribute = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("container_attributes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["container-attributes"] });
      toast.success("Attribute deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete attribute: " + error.message);
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

// Hook for fetching attribute values for a specific container
export const useContainerAttributeValues = (containerId: string | null) => {
  const queryClient = useQueryClient();

  const { data: values = [], isLoading } = useQuery({
    queryKey: ["container-attribute-values", containerId],
    queryFn: async () => {
      if (!containerId) return [];

      const { data, error } = await supabase
        .from("container_attribute_values")
        .select("*")
        .eq("container_id", containerId);

      if (error) throw error;
      return data as ContainerAttributeValue[];
    },
    enabled: !!containerId,
  });

  const saveValues = useMutation({
    mutationFn: async (input: {
      containerId: string;
      values: Record<string, string | null>;
    }) => {
      const entries = Object.entries(input.values).filter(
        ([_, value]) => value !== null && value !== ""
      );

      if (entries.length === 0) return;

      const upserts = entries.map(([attributeId, value]) => ({
        container_id: input.containerId,
        attribute_id: attributeId,
        value,
      }));

      const { error } = await supabase
        .from("container_attribute_values")
        .upsert(upserts, { onConflict: "container_id,attribute_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["container-attribute-values"] });
    },
    onError: (error) => {
      toast.error("Failed to save attribute values: " + error.message);
    },
  });

  return {
    values,
    isLoading,
    saveValues,
  };
};
