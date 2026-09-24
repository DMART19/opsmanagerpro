import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface TeamRole {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const TEAM_ROLES_QUERY_KEY = ["team-roles"];

const fetchTeamRoles = async (): Promise<TeamRole[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("team_roles")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    if (error.message.includes("JWT") || error.message.includes("LockManager")) return [];
    throw error;
  }
  return (data || []) as TeamRole[];
};

export const useTeamRoles = () => {
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading: loading, refetch } = useQuery({
    queryKey: TEAM_ROLES_QUERY_KEY,
    queryFn: fetchTeamRoles,
    staleTime: 1000 * 60 * 2, // 2 minutes — rarely changes
    gcTime: 1000 * 60 * 10,
    retry: 1,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("team_roles_changes_rq")
      .on("postgres_changes", { event: "*", schema: "public", table: "team_roles" }, () => {
        queryClient.invalidateQueries({ queryKey: TEAM_ROLES_QUERY_KEY });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const createRole = async (role: Partial<TeamRole>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("team_roles")
      .insert({
        user_id: user.id,
        name: role.name,
        description: role.description,
        color: role.color || "#6366f1",
        is_default: role.is_default || false,
        sort_order: roles.length,
      })
      .select()
      .single();

    if (error) throw error;

    toast({ title: "Role created", description: `"${role.name}" has been added.` });
    queryClient.invalidateQueries({ queryKey: TEAM_ROLES_QUERY_KEY });
    return data;
  };

  const updateRole = async (id: string, updates: Partial<TeamRole>) => {
    const { error } = await supabase
      .from("team_roles")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    toast({ title: "Role updated" });
    queryClient.invalidateQueries({ queryKey: TEAM_ROLES_QUERY_KEY });
  };

  const deleteRole = async (id: string) => {
    const { error } = await supabase
      .from("team_roles")
      .delete()
      .eq("id", id);

    if (error) {
      const match = error.message?.match(/assigned to (\d+) record/);
      if (match) {
        toast({
          title: "Cannot delete role",
          description: `This role is assigned to ${match[1]} record(s). Reassign before deleting.`,
          variant: "destructive",
        });
        return;
      }
      throw error;
    }

    toast({ title: "Role deleted" });
    queryClient.invalidateQueries({ queryKey: TEAM_ROLES_QUERY_KEY });
  };

  const setDefaultRole = async (id: string) => {
    await supabase
      .from("team_roles")
      .update({ is_default: false })
      .neq("id", id);

    const { error } = await supabase
      .from("team_roles")
      .update({ is_default: true })
      .eq("id", id);

    if (error) throw error;

    toast({ title: "Default role updated" });
    queryClient.invalidateQueries({ queryKey: TEAM_ROLES_QUERY_KEY });
  };

  return {
    roles,
    loading,
    createRole,
    updateRole,
    deleteRole,
    setDefaultRole,
    refetch,
  };
};
