/**
 * Form Persistence — Auto-save and restore form state to prevent data loss.
 * 
 * Uses sessionStorage keyed by form ID + route.
 * Automatically cleans up on successful submission.
 */

const PREFIX = "form_draft_";

function getKey(formId: string): string {
  return `${PREFIX}${formId}_${window.location.pathname}`;
}

/**
 * Save form draft to sessionStorage
 */
export function saveDraft<T extends Record<string, unknown>>(
  formId: string,
  data: T
): void {
  try {
    const key = getKey(formId);
    sessionStorage.setItem(
      key,
      JSON.stringify({ data, savedAt: Date.now() })
    );
  } catch {
    // Storage full or unavailable — silently fail
  }
}

/**
 * Restore form draft from sessionStorage.
 * Returns null if no draft exists or if it's older than maxAge (default 30 min).
 */
export function restoreDraft<T extends Record<string, unknown>>(
  formId: string,
  maxAgeMs: number = 30 * 60 * 1000
): T | null {
  try {
    const key = getKey(formId);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const { data, savedAt } = JSON.parse(raw);
    if (Date.now() - savedAt > maxAgeMs) {
      sessionStorage.removeItem(key);
      return null;
    }

    return data as T;
  } catch {
    return null;
  }
}

/**
 * Clear a specific form draft (call on successful submission)
 */
export function clearDraft(formId: string): void {
  try {
    sessionStorage.removeItem(getKey(formId));
  } catch {
    // ignore
  }
}

/**
 * Clear all form drafts
 */
export function clearAllDrafts(): void {
  try {
    const keys = Object.keys(sessionStorage).filter((k) =>
      k.startsWith(PREFIX)
    );
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}
