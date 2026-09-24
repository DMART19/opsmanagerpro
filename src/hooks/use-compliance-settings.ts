import { useUserSettings } from "./use-user-settings";

/**
 * Hook for accessing compliance-related settings with sensible defaults.
 * Used by status badges, alerts, and credential displays.
 */
export const useComplianceSettings = () => {
  const { complianceSettings, notificationSettings } = useUserSettings();

  // Warning threshold - when credentials should show "Expiring Soon"
  const warningThresholdDays = complianceSettings.warning_threshold_days || 
    notificationSettings.expiry_warning_days || 
    30;

  // Critical threshold - when urgent alerts are triggered
  const criticalThresholdDays = complianceSettings.critical_threshold_days || 7;

  // Determine status based on days until expiry
  const getCredentialStatus = (expireDate: Date | string | null, currentStatus?: string) => {
    // If explicitly assigned but not yet completed — neutral state, not alarming
    if (currentStatus === "Missing" || currentStatus === "Assigned") {
      return {
        status: "assigned" as const,
        severity: "info" as const,
        label: "Assigned",
        description: "Credential assigned — pending completion",
      };
    }

    // If no expiry date, consider it valid (non-expiring credential)
    if (!expireDate) {
      if (currentStatus === "Compliant") {
        return {
          status: "valid" as const,
          severity: "success" as const,
          label: "Valid",
          description: "Credential is current",
        };
      }
      return {
        status: "assigned" as const,
        severity: "info" as const,
        label: "Assigned",
        description: "Credential assigned — pending completion",
      };
    }

    const expiryDate = new Date(expireDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Expired
    if (daysUntilExpiry < 0) {
      return {
        status: "expired" as const,
        severity: "critical" as const,
        label: "Expired",
        description: `Expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? "s" : ""} ago`,
        daysUntilExpiry,
      };
    }

    // Critical - within critical threshold
    if (daysUntilExpiry <= criticalThresholdDays) {
      return {
        status: "expiring" as const,
        severity: "critical" as const,
        label: "Expiring Soon",
        description: `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`,
        daysUntilExpiry,
      };
    }

    // Warning - within warning threshold
    if (daysUntilExpiry <= warningThresholdDays) {
      return {
        status: "expiring" as const,
        severity: "warning" as const,
        label: "Expiring Soon",
        description: `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`,
        daysUntilExpiry,
      };
    }

    // Valid
    return {
      status: "valid" as const,
      severity: "success" as const,
      label: "Valid",
      description: `Expires in ${daysUntilExpiry} days`,
      daysUntilExpiry,
    };
  };

  return {
    warningThresholdDays,
    criticalThresholdDays,
    autoNotifyExpiring: complianceSettings.auto_notify_expiring ?? true,
    getCredentialStatus,
  };
};
