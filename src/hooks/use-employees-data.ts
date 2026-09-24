/**
 * Unified Employees Hook - Automatically switches between demo and production
 * 
 * In DEMO MODE: Uses in-memory data from DemoDataContext (no database access)
 * In PRODUCTION: Uses real Supabase database via useEmployees
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTourMode } from "@/contexts/TourModeContext";
import { useDemoDataOptional, DemoEmployee } from "@/contexts/DemoDataContext";
import { useEmployees, invalidateTeamMemberQueries } from "./use-employees";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface EmployeeData {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  status: string;
  department_id: string | null;
  employee_status_id: string | null;
  hire_date: string | null;
  avatar_url: string | null;
  base_location: string | null;
  employee_id: string | null;
  fema_id: string | null;
  notes: string | null;
  tags: string[] | null;
  role_id: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  requirements_stats: {
    compliant: number;
    expiring_soon: number;
    missing_expired: number;
    total: number;
  };
  employee_requirements: any[];
  team_role: { id: string; name: string; color: string } | null;
}

interface UseEmployeesDataResult {
  employees: any[]; // Using any[] for compatibility with both demo and production data shapes
  loading: boolean;
  refetch: () => Promise<void>;
  // CRUD operations
  addEmployee: (employee: Partial<EmployeeData>) => Promise<EmployeeData | null>;
  updateEmployee: (id: string, updates: Partial<EmployeeData>) => Promise<boolean>;
  deleteEmployee: (id: string) => Promise<boolean>;
  // Mode info
  isDemoMode: boolean;
}

export const useEmployeesData = (): UseEmployeesDataResult => {
  const queryClient = useQueryClient();
  const { isTourMode } = useTourMode();
  const demoData = useDemoDataOptional();
  
  // Production data
  const { 
    employees: prodEmployees, 
    loading: prodLoading, 
    refetch: prodRefetch 
  } = useEmployees();
  
  // Select data source
  const employees = isTourMode && demoData ? demoData.employees : prodEmployees;
  const loading = isTourMode ? false : prodLoading;
  
  const refetch = useCallback(async () => {
    if (!isTourMode) {
      await prodRefetch();
    }
  }, [isTourMode, prodRefetch]);
  
  // Add employee
  const addEmployee = useCallback(async (empData: Partial<EmployeeData>): Promise<EmployeeData | null> => {
    if (isTourMode && demoData) {
      const newEmp = demoData.addEmployee({
        first_name: empData.first_name || "New",
        last_name: empData.last_name || "Employee",
        email: empData.email || null,
        phone: empData.phone || null,
        position: empData.position || null,
        department: empData.department || null,
        status: empData.status || "Active",
        hire_date: empData.hire_date || null,
        avatar_url: empData.avatar_url || null,
        base_location: empData.base_location || null,
        employee_id: empData.employee_id || null,
        fema_id: empData.fema_id || null,
        notes: empData.notes || null,
        tags: empData.tags || null,
        role_id: empData.role_id || null,
      });
      
      toast({
        title: "Team Member Added",
        description: `${newEmp.first_name} ${newEmp.last_name} added to demo`,
      });
      
      return newEmp as unknown as EmployeeData;
    }
    
    // Production mode
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to add team members",
          variant: "destructive",
        });
        return null;
      }
      
      const { data, error } = await supabase
        .from("employees")
        .insert([{
          user_id: sessionData.session.user.id,
          first_name: empData.first_name || "New",
          last_name: empData.last_name || "Employee",
          email: empData.email || null,
          phone: empData.phone || null,
          position: empData.position || null,
          department_id: empData.department_id || null,
          employee_status_id: empData.employee_status_id || null,
          hire_date: empData.hire_date || null,
          avatar_url: empData.avatar_url || null,
          base_location: empData.base_location || null,
          employee_id: empData.employee_id || null,
          fema_id: empData.fema_id || null,
          notes: empData.notes || null,
          tags: empData.tags || null,
          role_id: empData.role_id || null,
        }])
        .select();
      
      if (error) throw error;
      if (!data || data.length === 0) return null;
      
      // Fire-and-forget event tracking
      import("@/lib/track-event").then(m => m.trackEvent("team_member_added", {
        object_id: data[0]?.id,
        object_name: `${empData.first_name} ${empData.last_name}`,
      }));
      
      // Full cache invalidation + refetch for consistency
      await invalidateTeamMemberQueries(queryClient);
      return {
        ...data[0],
        department: null,
        status: "Active",
        requirements_stats: { compliant: 0, expiring_soon: 0, missing_expired: 0, total: 0 },
        employee_requirements: [],
        team_role: null,
      } as unknown as EmployeeData;
    } catch (err: any) {
      toast({
        title: "Failed to Add Team Member",
        description: err.message,
        variant: "destructive",
      });
      return null;
    }
  }, [isTourMode, demoData, queryClient]);
  
  // Update employee
  const updateEmployee = useCallback(async (id: string, updates: Partial<EmployeeData>): Promise<boolean> => {
    if (isTourMode && demoData) {
      demoData.updateEmployee(id, updates as Partial<DemoEmployee>);
      toast({ title: "Team Member Updated" });
      return true;
    }
    
    try {
      const { error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
      
      // Full cache invalidation + refetch for consistency
      await invalidateTeamMemberQueries(queryClient);
      return true;
    } catch (err: any) {
      toast({
        title: "Failed to Update Team Member",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  }, [isTourMode, demoData, queryClient]);
  
  // Delete employee
  const deleteEmployee = useCallback(async (id: string): Promise<boolean> => {
    if (isTourMode && demoData) {
      try {
        demoData.deleteEmployee(id);
        toast({ title: "Team Member Removed" });
        return true;
      } catch (err: any) {
        toast({
          title: "Cannot Remove",
          description: err.message,
          variant: "destructive",
        });
        return false;
      }
    }
    
    try {
      // Get current user for deleted_by audit field
      const { data: { user } } = await supabase.auth.getUser();
      
      // Soft delete with audit trail
      const { error } = await supabase
        .from("employees")
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id ?? null,
        })
        .eq("id", id);
      
      if (error) throw error;
      
      // Force clear stale team caches and refetch authoritative DB-backed data
      await invalidateTeamMemberQueries(queryClient);
      return true;
    } catch (err: any) {
      toast({
        title: "Failed to Remove Team Member",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  }, [isTourMode, demoData, queryClient]);
  
  return {
    employees,
    loading,
    refetch,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    isDemoMode: isTourMode,
  };
};
