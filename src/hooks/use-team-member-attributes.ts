import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AttributeType = "text" | "number" | "date" | "boolean" | "select";

export interface TeamMemberAttribute {
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

export interface AttributeValue {
  id: string;
  employee_id: string;
  attribute_id: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAttributeInput {
  name: string;
  type: AttributeType;
  options?: string[];
  required?: boolean;
}

export const useTeamMemberAttributes = () => {
  const queryClient = useQueryClient();

  // Fetch all attribute definitions for the current workspace
  const { data: attributes = [], isLoading, refetch } = useQuery({
    queryKey: ["team-member-attributes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("team_member_attributes")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as TeamMemberAttribute[];
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  // Create a new attribute definition
  const createAttribute = useMutation({
    mutationFn: async (input: CreateAttributeInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("team_member_attributes")
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
      return data as TeamMemberAttribute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-member-attributes"] });
      toast.success("Custom attribute created");
    },
    onError: (error: Error) => {
      toast.error("Failed to create attribute", { description: error.message });
    },
  });

  // Update an existing attribute definition
  const updateAttribute = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateAttributeInput> }) => {
      const updateData: Record<string, any> = {};
      if (updates.name !== undefined) updateData.name = updates.name.trim();
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.options !== undefined) updateData.options = updates.options;
      if (updates.required !== undefined) updateData.required = updates.required;

      const { data, error } = await supabase
        .from("team_member_attributes")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as TeamMemberAttribute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-member-attributes"] });
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
        .from("team_member_attributes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-member-attributes"] });
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

// Hook for managing attribute values for a specific employee
export const useEmployeeAttributeValues = (employeeId: string | null) => {
  const queryClient = useQueryClient();

  const { data: values = [], isLoading, refetch } = useQuery({
    queryKey: ["employee-attribute-values", employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      const { data, error } = await supabase
        .from("team_member_attribute_values")
        .select("*")
        .eq("employee_id", employeeId);

      if (error) throw error;
      return data as AttributeValue[];
    },
    enabled: !!employeeId,
  });

  // Save values for an employee (upsert)
  const saveValues = useMutation({
    mutationFn: async ({ 
      employeeId, 
      attributeValues 
    }: { 
      employeeId: string; 
      attributeValues: Record<string, string | null>;
    }) => {
      // Convert the record to an array of upserts
      const upserts = Object.entries(attributeValues).map(([attributeId, value]) => ({
        employee_id: employeeId,
        attribute_id: attributeId,
        value: value ?? null,
      }));

      if (upserts.length === 0) return [];

      const { data, error } = await supabase
        .from("team_member_attribute_values")
        .upsert(upserts, {
          onConflict: "employee_id,attribute_id",
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["employee-attribute-values", variables.employeeId] 
      });
    },
    onError: (error: Error) => {
      console.error("Failed to save attribute values:", error);
      // Don't show toast here as it's usually called during employee save
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
