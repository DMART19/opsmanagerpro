import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface MappingTemplate {
  id: string;
  name: string;
  description: string | null;
  table_name: string;
  field_mappings: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export const useMappingTemplates = (tableName: string) => {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["mapping-templates", tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mapping_templates")
        .select("*")
        .eq("table_name", tableName)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MappingTemplate[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes — templates rarely change
    gcTime: 1000 * 60 * 15,
  });

  const saveTemplate = useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      fieldMappings: Record<string, string>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("mapping_templates")
        .insert({
          name: params.name,
          description: params.description || null,
          table_name: tableName,
          field_mappings: params.fieldMappings,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapping-templates", tableName] });
      toast({
        title: "Template saved",
        description: "Mapping template saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("mapping_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapping-templates", tableName] });
      toast({
        title: "Template deleted",
        description: "Mapping template deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    templates,
    isLoading,
    saveTemplate: saveTemplate.mutate,
    deleteTemplate: deleteTemplate.mutate,
  };
};
