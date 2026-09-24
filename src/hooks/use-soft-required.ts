/**
 * useSoftRequired — Framework for soft-required field validation
 * 
 * Tracks which soft-required fields are empty and provides:
 * - Per-field warning state
 * - "Complete Key Details?" prompt logic (once per save)
 * - Default value assignment for skipped fields
 */

import { useState, useCallback, useMemo } from "react";

export interface SoftRequiredField {
  /** Unique key for this field */
  key: string;
  /** Human-readable label */
  label: string;
  /** Guidance message shown inline */
  hint: string;
  /** Default value to assign if skipped */
  defaultValue: string;
  /** Current value (empty string or null = missing) */
  value: string | null | undefined;
}

interface UseSoftRequiredReturn {
  /** Fields that are currently empty */
  missingFields: SoftRequiredField[];
  /** Whether any soft-required fields are empty */
  hasMissing: boolean;
  /** Whether prompt modal should show */
  showPrompt: boolean;
  /** Call before save — returns true if save can proceed, false if prompt shown */
  checkBeforeSave: () => boolean;
  /** User chose "Add Now" — close prompt and focus first missing field */
  handleAddNow: () => void;
  /** User chose "Skip" — proceed with defaults */
  handleSkip: () => Record<string, string>;
  /** Dismiss prompt without action */
  dismissPrompt: () => void;
}

export function useSoftRequired(fields: SoftRequiredField[]): UseSoftRequiredReturn {
  const [showPrompt, setShowPrompt] = useState(false);

  const missingFields = useMemo(() => {
    return fields.filter(f => !f.value || f.value.trim() === "");
  }, [fields]);

  const hasMissing = missingFields.length > 0;

  const checkBeforeSave = useCallback(() => {
    if (missingFields.length === 0) return true;
    setShowPrompt(true);
    return false;
  }, [missingFields]);

  const handleAddNow = useCallback(() => {
    setShowPrompt(false);
  }, []);

  const handleSkip = useCallback(() => {
    setShowPrompt(false);
    const defaults: Record<string, string> = {};
    missingFields.forEach(f => {
      defaults[f.key] = f.defaultValue;
    });
    return defaults;
  }, [missingFields]);

  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
  }, []);

  return {
    missingFields,
    hasMissing,
    showPrompt,
    checkBeforeSave,
    handleAddNow,
    handleSkip,
    dismissPrompt,
  };
}
