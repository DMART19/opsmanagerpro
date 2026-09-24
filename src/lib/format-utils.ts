import { format as dateFnsFormat, parseISO } from "date-fns";
import { toZonedTime, format as formatTz } from "date-fns-tz";

// Date format mapping from settings to date-fns format strings
const DATE_FORMAT_MAP: Record<string, string> = {
  "MM/dd/yyyy": "MM/dd/yyyy",
  "dd/MM/yyyy": "dd/MM/yyyy", 
  "yyyy-MM-dd": "yyyy-MM-dd",
  "MMM dd, yyyy": "MMM dd, yyyy",
};

// Get date-fns format string from settings format
export const getDateFormat = (settingsFormat: string): string => {
  return DATE_FORMAT_MAP[settingsFormat] || "MM/dd/yyyy";
};

// Get time format string based on 12/24 hour preference
export const getTimeFormat = (timeFormat: string): string => {
  return timeFormat === "24" ? "HH:mm" : "h:mm a";
};

// Format a time string (like "14:00") to user's preferred format
export const formatTimeString = (
  timeStr: string,
  timeFormat: string = "12"
): string => {
  if (!timeStr) return "";
  
  try {
    // Parse time string like "14:00" or "09:30"
    const [hours, minutes] = timeStr.split(":").map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) return timeStr;
    
    if (timeFormat === "24") {
      // 24-hour format
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    } else {
      // 12-hour format
      const period = hours >= 12 ? "PM" : "AM";
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
    }
  } catch (error) {
    console.error("Error formatting time string:", error);
    return timeStr;
  }
};

// Get full datetime format
export const getDateTimeFormat = (dateFormat: string, timeFormat: string): string => {
  return `${getDateFormat(dateFormat)} ${getTimeFormat(timeFormat)}`;
};

// Format a date according to user settings
export const formatDate = (
  date: Date | string | null | undefined,
  dateFormat: string = "MM/dd/yyyy",
  timezone?: string
): string => {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    
    if (timezone) {
      const zonedDate = toZonedTime(dateObj, timezone);
      return formatTz(zonedDate, getDateFormat(dateFormat), { timeZone: timezone });
    }
    
    return dateFnsFormat(dateObj, getDateFormat(dateFormat));
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

// Format a time according to user settings
export const formatTime = (
  date: Date | string | null | undefined,
  timeFormat: string = "12",
  timezone?: string
): string => {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    
    if (timezone) {
      const zonedDate = toZonedTime(dateObj, timezone);
      return formatTz(zonedDate, getTimeFormat(timeFormat), { timeZone: timezone });
    }
    
    return dateFnsFormat(dateObj, getTimeFormat(timeFormat));
  } catch (error) {
    console.error("Error formatting time:", error);
    return "";
  }
};

// Format a datetime according to user settings
export const formatDateTime = (
  date: Date | string | null | undefined,
  dateFormat: string = "MM/dd/yyyy",
  timeFormat: string = "12",
  timezone?: string
): string => {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    const formatStr = getDateTimeFormat(dateFormat, timeFormat);
    
    if (timezone) {
      const zonedDate = toZonedTime(dateObj, timezone);
      return formatTz(zonedDate, formatStr, { timeZone: timezone });
    }
    
    return dateFnsFormat(dateObj, formatStr);
  } catch (error) {
    console.error("Error formatting datetime:", error);
    return "";
  }
};

// Measurement conversion utilities
export const convertWeight = (
  value: number,
  fromUnit: "imperial" | "metric",
  toUnit: "imperial" | "metric"
): number => {
  if (fromUnit === toUnit) return value;
  
  // imperial = pounds (lb), metric = kilograms (kg)
  if (fromUnit === "imperial" && toUnit === "metric") {
    return value * 0.453592; // lb to kg
  } else {
    return value * 2.20462; // kg to lb
  }
};

export const convertLength = (
  value: number,
  fromUnit: "imperial" | "metric",
  toUnit: "imperial" | "metric"
): number => {
  if (fromUnit === toUnit) return value;
  
  // imperial = inches (in), metric = centimeters (cm)
  if (fromUnit === "imperial" && toUnit === "metric") {
    return value * 2.54; // in to cm
  } else {
    return value / 2.54; // cm to in
  }
};

export const getWeightLabel = (unit: string): string => {
  return unit === "metric" ? "kg" : "lb";
};

export const getLengthLabel = (unit: string): string => {
  return unit === "metric" ? "cm" : "in";
};

export const getDimensionLabel = (unit: string): string => {
  return unit === "metric" ? "cm" : "in";
};

// Generate asset tag based on settings
export const generateAssetTag = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AST-${timestamp}-${random}`;
};
