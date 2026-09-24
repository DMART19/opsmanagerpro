import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSuperAdmin = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsSuperAdmin(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "super_admin")
          .maybeSingle();

        setIsSuperAdmin(!error && !!data);
      } catch {
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, []);

  return { isSuperAdmin, loading };
};
