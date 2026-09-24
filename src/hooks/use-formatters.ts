import { useSettings } from "@/contexts/SettingsContext";
import { 
  formatDate as formatDateUtil, 
  formatTime as formatTimeUtil,
  formatDateTime as formatDateTimeUtil,
  formatTimeString as formatTimeStringUtil,
  getWeightLabel,
  getLengthLabel,
  generateAssetTag
} from "@/lib/format-utils";
import { useCallback } from "react";

// Auto-detect browser timezone (used as default, not user-configurable)
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

// Fixed date format for consistency
const FIXED_DATE_FORMAT = "MMM dd, yyyy";

/**
 * Hook that provides formatting utilities based on user settings.
 * Timezone, date format, and measurement units are auto-detected for simplicity.
 * Only time_format (12h/24h) is user-configurable.
 */
export const useFormatters = () => {
  const { workspaceSettings, assetSettings } = useSettings();
  
  // Use auto-detected values for removed settings
  const timezone = getBrowserTimezone();
  const date_format = FIXED_DATE_FORMAT;
  const measurement_unit = getDefaultMeasurementUnit();
  
  // Time format is still user-configurable
  const { time_format } = workspaceSettings;
  
  // Format a date according to user settings
  const formatDate = useCallback((date: Date | string | null | undefined) => {
    return formatDateUtil(date, date_format, timezone);
  }, [date_format, timezone]);
  
  // Format a time according to user settings
  const formatTime = useCallback((date: Date | string | null | undefined) => {
    return formatTimeUtil(date, time_format, timezone);
  }, [time_format, timezone]);
  
  // Format a time string like "14:00" to user's preferred format
  const formatTimeString = useCallback((timeStr: string) => {
    return formatTimeStringUtil(timeStr, time_format);
  }, [time_format]);
  
  // Format a datetime according to user settings
  const formatDateTime = useCallback((date: Date | string | null | undefined) => {
    return formatDateTimeUtil(date, date_format, time_format, timezone);
  }, [date_format, time_format, timezone]);
  
  // Get the weight unit label (based on auto-detected locale)
  const weightLabel = getWeightLabel(measurement_unit);
  
  // Get the length unit label (based on auto-detected locale)
  const lengthLabel = getLengthLabel(measurement_unit);
  
  // Format weight with auto-detected unit
  const formatWeight = useCallback((value: number | null | undefined, fromUnit: "imperial" | "metric" = "imperial") => {
    if (value === null || value === undefined) return "";
    // No conversion needed - use stored unit directly for simplicity
    return `${Number(value).toFixed(1)} ${weightLabel}`;
  }, [weightLabel]);
  
  // Format length with auto-detected unit
  const formatLength = useCallback((value: number | null | undefined, fromUnit: "imperial" | "metric" = "imperial") => {
    if (value === null || value === undefined) return "";
    // No conversion needed - use stored unit directly for simplicity
    return `${Number(value).toFixed(1)} ${lengthLabel}`;
  }, [lengthLabel]);
  
  // Generate a unique asset tag if auto-generation is enabled
  const getNewAssetTag = useCallback(() => {
    if (assetSettings.auto_generate_asset_tags) {
      return generateAssetTag();
    }
    return "";
  }, [assetSettings.auto_generate_asset_tags]);
  
  return {
    formatDate,
    formatTime,
    formatTimeString,
    formatDateTime,
    formatWeight,
    formatLength,
    weightLabel,
    lengthLabel,
    timezone,
    dateFormat: date_format,
    timeFormat: time_format,
    measurementUnit: measurement_unit,
    getNewAssetTag,
    shouldGroupDuplicates: assetSettings.group_duplicates,
    requireCheckoutNotes: assetSettings.require_checkout_notes,
    categories: assetSettings.default_categories,
    statuses: assetSettings.status_options,
  };
};
