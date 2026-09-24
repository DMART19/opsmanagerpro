import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useSuperAdmin } from "@/hooks/use-super-admin";
import { useMfaStatus } from "@/hooks/use-mfa-status";
import { PageLoader } from "@/components/PageLoader";
import { REQUIRE_MFA_FOR_ADMINS } from "@/config/security";
import { logSecurityEvent } from "@/lib/log-security-event";

/**
 * Founder / admin route guard.
 * Phase 2: also requires MFA enrollment when REQUIRE_MFA_FOR_ADMINS is on.
 * Denied attempts are logged as `privileged_access_denied`.
 */
export const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isSuperAdmin, loading } = useSuperAdmin();
  const { enrolled, loading: mfaLoading } = useMfaStatus();

  useEffect(() => {
    if (loading || mfaLoading) return;
    if (!isSuperAdmin) {
      void logSecurityEvent({
        event_type: "privileged_access_denied",
        severity: "medium",
        details: { reason: "not_super_admin" },
      });
    } else if (REQUIRE_MFA_FOR_ADMINS && !enrolled) {
      void logSecurityEvent({
        event_type: "privileged_access_denied",
        severity: "high",
        details: { reason: "mfa_required" },
      });
    }
  }, [loading, mfaLoading, isSuperAdmin, enrolled]);

  if (loading || mfaLoading) return <PageLoader />;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;
  if (REQUIRE_MFA_FOR_ADMINS && !enrolled) {
    return <Navigate to="/settings?tab=security&mfa=required" replace />;
  }
  return <>{children}</>;
};
