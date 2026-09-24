import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "super_admin" | "admin" | "manager" | "technician" | "staff" | "viewer";

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
          setRole(null);
        } else {
          setRole(data?.role as UserRole);
        }
      } catch (error) {
        console.error("Error in fetchUserRole:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!role) return false;
    
    const roleHierarchy: Record<UserRole, number> = {
      viewer: 1,
      staff: 2,
      technician: 3,
      manager: 4,
      admin: 5,
      super_admin: 6,
    };

    return roleHierarchy[role] >= roleHierarchy[requiredRole];
  };

  const isAdmin = role === "admin";
  const isManager = hasRole("manager");

  return { role, loading, hasRole, isAdmin, isManager };
};
