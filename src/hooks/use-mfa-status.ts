import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listVerifiedTotpFactors,
  type MfaFactorSummary,
} from "@/lib/auth/mfa";

export interface UseMfaStatus {
  loading: boolean;
  enrolled: boolean;
  factors: MfaFactorSummary[];
  refresh: () => Promise<void>;
}

/** Reactive MFA status for the current user. */
export function useMfaStatus(): UseMfaStatus {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<MfaFactorSummary[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listVerifiedTotpFactors();
      setFactors(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (active) void refresh();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  const enrolled = factors.some((f) => f.status === "verified");
  return { loading, enrolled, factors, refresh };
}