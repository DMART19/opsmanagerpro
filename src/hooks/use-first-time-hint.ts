/**
 * useFirstTimeHint — Lightweight localStorage-based hint system
 * 
 * Shows a hint once per unique key. After dismissal (or auto-fade),
 * it never reappears. Stateless outside localStorage.
 */

import { useState, useCallback, useEffect } from "react";

const HINT_PREFIX = "omp_hint_seen_";

export function useFirstTimeHint(key: string, autoFadeMs?: number) {
  const storageKey = `${HINT_PREFIX}${key}`;
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem(storageKey);
    } catch {
      return true;
    }
  });

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // silently fail
    }
  }, [storageKey]);

  // Auto-fade after specified duration
  useEffect(() => {
    if (!visible || !autoFadeMs) return;
    const timer = setTimeout(dismiss, autoFadeMs);
    return () => clearTimeout(timer);
  }, [visible, autoFadeMs, dismiss]);

  return { visible, dismiss };
}
