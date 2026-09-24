import { useSettings } from "@/contexts/SettingsContext";
import type { 
  WorkspaceSettings, 
  NotificationSettings, 
  AssetSettings 
} from "@/contexts/SettingsContext";

// Re-export types for backward compatibility
export type { WorkspaceSettings, NotificationSettings, AssetSettings };

// Legacy types for backward compatibility
export interface ComplianceSettings {
  id?: string;
  user_id?: string;
  warning_threshold_days: number;
  critical_threshold_days: number;
  expired_severity: string;
  expiring_soon_severity: string;
  missing_credential_severity: string;
  auto_notify_expiring: boolean;
}

export interface ExportSettings {
  id?: string;
  user_id?: string;
  default_format: string;
  include_headers: boolean;
  date_range_default: string;
}

// Auto-detect browser timezone
const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
};

// Auto-detect measurement unit based on locale
const getDefaultMeasurementUnit = (): "imperial" | "metric" => {
  try {
    const locale = navigator.language || "en-US";
    return locale.startsWith("en-US") || locale === "en-LR" || locale === "my" 
      ? "imperial" 
      : "metric";
  } catch {
    return "imperial";
  }
};

// Export default settings for reference
export const defaultWorkspaceSettings: WorkspaceSettings = {
  workspace_name: "My Workspace",
  timezone: getBrowserTimezone(),
  date_format: "MMM dd, yyyy",
  time_format: "12",
  measurement_unit: getDefaultMeasurementUnit(),
  default_view: "dashboard",
};

export const defaultNotificationSettings: NotificationSettings = {
  email_enabled: true,
  in_app_enabled: true,
  checkout_alerts: true,
  maintenance_alerts: true,
  certification_expiry_alerts: true,
  compliance_alerts: true,
  task_due_alerts: true,
  audit_reminders: true,
  expiry_warning_days: 30,
};

export const defaultAssetSettings: AssetSettings = {
  default_categories: ["Equipment", "Electronics", "Furniture", "Tools", "Safety Gear"],
  status_options: ["Available", "In Use", "Under Service", "Retired"],
  group_duplicates: true,
  auto_generate_asset_tags: true,
  require_checkout_notes: false,
};

// This hook now wraps the context for backward compatibility
export const useUserSettings = () => {
  const settings = useSettings();
  
  return {
    workspaceSettings: settings.workspaceSettings,
    notificationSettings: settings.notificationSettings,
    assetSettings: settings.assetSettings,
    // Provide empty defaults for removed settings
    complianceSettings: {
      warning_threshold_days: settings.notificationSettings.expiry_warning_days,
      critical_threshold_days: 7,
      expired_severity: "critical",
      expiring_soon_severity: "warning",
      missing_credential_severity: "medium",
      auto_notify_expiring: true,
    },
    exportSettings: {
      default_format: "csv",
      include_headers: true,
      date_range_default: "30days",
    },
    loading: settings.loading,
    saving: settings.saving,
    saveWorkspaceSettings: settings.saveWorkspaceSettings,
    saveNotificationSettings: settings.saveNotificationSettings,
    saveAssetSettings: settings.saveAssetSettings,
    saveComplianceSettings: async () => true,
    saveExportSettings: async () => true,
    refetch: settings.refetch,
  };
};
