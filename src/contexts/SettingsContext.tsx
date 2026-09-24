import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// Auto-detect browser timezone
const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
};

// Auto-detect measurement unit based on locale (US uses imperial)
const getDefaultMeasurementUnit = (): "imperial" | "metric" => {
  try {
    const locale = navigator.language || "en-US";
    // US, Liberia, and Myanmar use imperial
    return locale.startsWith("en-US") || locale === "en-LR" || locale === "my" 
      ? "imperial" 
      : "metric";
  } catch {
    return "imperial";
  }
};

export interface WorkspaceSettings {
  id?: string;
  user_id?: string;
  workspace_name: string;
  timezone: string; // Auto-detected, not user-configurable
  date_format: string; // Fixed format
  time_format: string;
  measurement_unit: string; // Auto-detected, not user-configurable
  default_view: string; // Always dashboard
  // Subscription fields (read-only in this context)
  trial_started_at?: string;
  trial_ends_at?: string;
  subscription_status?: string;
}

export interface NotificationSettings {
  id?: string;
  user_id?: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  checkout_alerts: boolean;
  maintenance_alerts: boolean;
  certification_expiry_alerts: boolean;
  compliance_alerts: boolean;
  task_due_alerts: boolean;
  audit_reminders: boolean;
  expiry_warning_days: number;
}

export interface AssetSettings {
  id?: string;
  user_id?: string;
  default_categories: string[];
  status_options: string[];
  group_duplicates: boolean;
  auto_generate_asset_tags: boolean;
  require_checkout_notes: boolean;
}

const defaultWorkspaceSettings: WorkspaceSettings = {
  workspace_name: "My Workspace",
  timezone: getBrowserTimezone(), // Auto-detect from browser
  date_format: "MMM dd, yyyy", // Consistent, readable format
  time_format: "12",
  measurement_unit: getDefaultMeasurementUnit(), // Auto-detect based on locale
  default_view: "dashboard", // Always dashboard
};

const defaultNotificationSettings: NotificationSettings = {
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

const defaultAssetSettings: AssetSettings = {
  default_categories: ["Equipment", "Electronics", "Furniture", "Tools", "Safety Gear"],
  status_options: ["Available", "In Use", "Under Service", "Retired"],
  group_duplicates: true,
  auto_generate_asset_tags: true,
  require_checkout_notes: false,
};

interface SettingsContextType {
  workspaceSettings: WorkspaceSettings;
  notificationSettings: NotificationSettings;
  assetSettings: AssetSettings;
  loading: boolean;
  saving: boolean;
  saveWorkspaceSettings: (settings: Partial<WorkspaceSettings>) => Promise<boolean>;
  saveNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<boolean>;
  saveAssetSettings: (settings: Partial<AssetSettings>) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings>(defaultWorkspaceSettings);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [assetSettings, setAssetSettings] = useState<AssetSettings>(defaultAssetSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: configData, error: configError } = await supabase.rpc("get_cached_workspace_configuration");
      if (configError) throw configError;

      const config = (configData && typeof configData === "object" && !Array.isArray(configData))
        ? (configData as any)
        : {};

      const workspaceConfig = config.workspace_settings;
      const notificationConfig = config.notification_settings;
      const assetConfig = config.asset_settings;

      if (workspaceConfig && typeof workspaceConfig === "object") {
        setWorkspaceSettings({ ...defaultWorkspaceSettings, ...workspaceConfig });
        // Fire-and-forget access log
        import("@/lib/log-data-access").then(m =>
          m.logDataAccess({ objectType: "workspace_settings", actionType: "read" })
        );
      }
      if (notificationConfig && typeof notificationConfig === "object") {
        setNotificationSettings({ ...defaultNotificationSettings, ...notificationConfig });
      }
      if (assetConfig && typeof assetConfig === "object") {
        setAssetSettings({
          ...defaultAssetSettings,
          ...assetConfig,
          default_categories: assetConfig.default_categories || defaultAssetSettings.default_categories,
          status_options: assetConfig.status_options || defaultAssetSettings.status_options,
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    
    // Only reload on meaningful auth changes (sign in/out), NOT token refreshes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        loadSettings();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadSettings]);

  const saveWorkspaceSettings = async (settings: Partial<WorkspaceSettings>): Promise<boolean> => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updatedSettings = { ...workspaceSettings, ...settings, user_id: user.id };
      
      const { error } = await supabase
        .from("workspace_settings")
        .upsert(updatedSettings, { onConflict: "user_id" });

      if (error) throw error;
      
      setWorkspaceSettings(updatedSettings);
      return true;
    } catch (error: any) {
      console.error("Error saving workspace settings:", error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async (settings: Partial<NotificationSettings>): Promise<boolean> => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updatedSettings = { ...notificationSettings, ...settings, user_id: user.id };
      
      const { error } = await supabase
        .from("notification_settings")
        .upsert(updatedSettings, { onConflict: "user_id" });

      if (error) throw error;
      
      setNotificationSettings(updatedSettings);
      return true;
    } catch (error: any) {
      console.error("Error saving notification settings:", error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveAssetSettings = async (settings: Partial<AssetSettings>): Promise<boolean> => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updatedSettings = { ...assetSettings, ...settings, user_id: user.id };
      
      const { error } = await supabase
        .from("asset_settings")
        .upsert(updatedSettings, { onConflict: "user_id" });

      if (error) throw error;
      
      setAssetSettings(updatedSettings);
      return true;
    } catch (error: any) {
      console.error("Error saving asset settings:", error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsContext.Provider value={{
      workspaceSettings,
      notificationSettings,
      assetSettings,
      loading,
      saving,
      saveWorkspaceSettings,
      saveNotificationSettings,
      saveAssetSettings,
      refetch: loadSettings,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

// Hook for just reading settings (doesn't throw if outside provider)
export const useSettingsOptional = () => {
  const context = useContext(SettingsContext);
  return context;
};
