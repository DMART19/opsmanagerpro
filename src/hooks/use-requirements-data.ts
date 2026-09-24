/**
 * Unified Requirements Hook - Automatically switches between demo and production
 * 
 * In DEMO MODE: Uses in-memory data from DemoDataContext (no database access)
 * In PRODUCTION: Uses real Supabase database via useRequirements
 */

import { useMemo } from "react";
import { useTourMode } from "@/contexts/TourModeContext";
import { useDemoDataOptional } from "@/contexts/DemoDataContext";
import { useRequirements } from "./use-requirements";
import { differenceInDays } from "date-fns";

export const useRequirementsData = () => {
  const { isTourMode } = useTourMode();
  const demoData = useDemoDataOptional();
  const { requirements: prodRequirements, loading: prodLoading, refetch: prodRefetch } = useRequirements();

  const requirements = useMemo(() => {
    if (isTourMode && demoData) {
      // Build requirement objects with computed stats from demo employee_requirements
      return demoData.requirements.map(req => {
        const empReqs = demoData.employeeRequirements.filter(
          er => er.requirement_id === req.id
        );

        const xTOTotal = empReqs.length;
        const xCurrentTotal = empReqs.filter(r => r.status === 'Compliant').length;
        const xExpiredTotal = empReqs.filter(r => r.status === 'Expired').length;
        const xMissingTotal = empReqs.filter(r => r.status === 'Missing').length;

        return {
          ...req,
          employee_requirements: empReqs,
          xTOTotal,
          xCurrentTotal,
          xExpiredTotal,
          xMissingTotal,
        };
      });
    }
    return prodRequirements;
  }, [isTourMode, demoData, prodRequirements]);

  const loading = isTourMode ? false : prodLoading;

  const refetch = async () => {
    if (!isTourMode) {
      await prodRefetch();
    }
  };

  return { requirements, loading, refetch, isDemoMode: isTourMode };
};

/**
 * Get assigned members for a specific credential in demo mode
 */
export const useDemoCredentialMembers = (credentialId: string | null) => {
  const demoData = useDemoDataOptional();

  return useMemo(() => {
    if (!demoData || !credentialId) return [];

    const empReqs = demoData.employeeRequirements.filter(
      er => er.requirement_id === credentialId
    );

    return empReqs.map(er => {
      const employee = demoData.employees.find(e => e.id === er.employee_id);
      return {
        id: er.id,
        employee_id: er.employee_id,
        status: er.status,
        issue_date: er.issue_date,
        expire_date: er.expire_date,
        notes: er.notes,
        employee: employee ? {
          id: employee.id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          position: employee.position,
          department: employee.department,
        } : null,
      };
    });
  }, [demoData, credentialId]);
};
