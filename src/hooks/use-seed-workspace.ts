/**
 * useSeedWorkspace — Hook to seed and clear demo data for a workspace.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useSeedWorkspace = () => {
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const queryClient = useQueryClient();

  const seedWorkspace = useCallback(async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-workspace-data");
      if (error) throw error;
      if (data?.seeded) {
        toast.success("Example data added to your workspace");
        queryClient.invalidateQueries();
      }
      return data?.seeded ?? false;
    } catch (err: any) {
      console.error("Seed workspace error:", err);
      toast.error("Failed to generate example data");
      return false;
    } finally {
      setSeeding(false);
    }
  }, [queryClient]);

  const clearSeedData = useCallback(async () => {
    setClearing(true);
    try {
      const { data, error } = await supabase.functions.invoke("clear-seed-data");
      if (error) throw error;
      toast.success("Example data cleared");
      queryClient.invalidateQueries();
      return true;
    } catch (err: any) {
      console.error("Clear seed data error:", err);
      toast.error("Failed to clear example data");
      return false;
    } finally {
      setClearing(false);
    }
  }, [queryClient]);

  return { seedWorkspace, clearSeedData, seeding, clearing };
};
