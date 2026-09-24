import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AttributeType = "text" | "number" | "date" | "boolean" | "select";

export interface AssetAttribute {
  id: string;
  user_id: string;
  name: string;
  type: AttributeType;
  options: string[] | null;
  required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AssetAttributeValue {
  id: string;
  asset_id: string;
  attribute_id: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAssetAttributeInput {
  name: string;
  type: AttributeType;
  options?: string[];
  required?: boolean;
}

export const useAssetAttributes = () => {
  const queryClient = useQueryClient();

  // Fetch all attribute definitions for the current workspace
  const { data: attributes = [], isLoading, refetch } = useQuery({
    queryKey: ["asset-attributes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("asset_attributes")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as AssetAttribute[];
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  // Create a new attribute definition
  const createAttribute = useMutation({
    mutationFn: async (input: CreateAssetAttributeInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("asset_attributes")
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          type: input.type,
          options: input.type === "select" ? input.options : null,
          required: input.required ?? false,
          sort_order: attributes.length,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AssetAttribute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-attributes"] });
      toast.success("Custom attribute created");
    },
    onError: (error: Error) => {
      toast.error("Failed to create attribute", { description: error.message });
    },
  });

  // Update an existing attribute definition
  const updateAttribute = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateAssetAttributeInput> }) => {
      const updateData: Record<string, any> = {};
      if (updates.name !== undefined) updateData.name = updates.name.trim();
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.options !== undefined) updateData.options = updates.options;
      if (updates.required !== undefined) updateData.required = updates.required;

      const { data, error } = await supabase
        .from("asset_attributes")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as AssetAttribute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-attributes"] });
      toast.success("Attribute updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update attribute", { description: error.message });
    },
  });

  // Delete an attribute definition
  const deleteAttribute = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("asset_attributes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-attributes"] });
      toast.success("Attribute deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete attribute", { description: error.message });
    },
  });

  return {
    attributes,
    isLoading,
    refetch,
    createAttribute: createAttribute.mutateAsync,
    updateAttribute: updateAttribute.mutate,
    deleteAttribute: deleteAttribute.mutate,
    isCreating: createAttribute.isPending,
    isUpdating: updateAttribute.isPending,
    isDeleting: deleteAttribute.isPending,
  };
};

// Hook for managing attribute values for a specific asset
export const useAssetAttributeValues = (assetId: string | null) => {
  const queryClient = useQueryClient();

  const { data: values = [], isLoading, refetch } = useQuery({
    queryKey: ["asset-attribute-values", assetId],
    queryFn: async () => {
      if (!assetId) return [];

      const { data, error } = await supabase
        .from("asset_attribute_values")
        .select("*")
        .eq("asset_id", assetId);

      if (error) throw error;
      return data as AssetAttributeValue[];
    },
    enabled: !!assetId,
  });

  // Save values for an asset (upsert)
  const saveValues = useMutation({
    mutationFn: async ({ 
      assetId, 
      attributeValues 
    }: { 
      assetId: string; 
      attributeValues: Record<string, string | null>;
    }) => {
      // Convert the record to an array of upserts
      const upserts = Object.entries(attributeValues).map(([attributeId, value]) => ({
        asset_id: assetId,
        attribute_id: attributeId,
        value: value ?? null,
      }));

      if (upserts.length === 0) return [];

      const { data, error } = await supabase
        .from("asset_attribute_values")
        .upsert(upserts, {
          onConflict: "asset_id,attribute_id",
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["asset-attribute-values", variables.assetId] 
      });
    },
    onError: (error: Error) => {
      console.error("Failed to save attribute values:", error);
    },
  });

  // Convert values array to a lookup object
  const valuesMap = values.reduce<Record<string, string | null>>((acc, val) => {
    acc[val.attribute_id] = val.value;
    return acc;
  }, {});

  return {
    values,
    valuesMap,
    isLoading,
    refetch,
    saveValues: saveValues.mutateAsync,
    isSaving: saveValues.isPending,
  };
};
