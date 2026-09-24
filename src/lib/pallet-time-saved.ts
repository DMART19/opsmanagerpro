/**
 * Session-scoped tracker for "Time Saved" KPI.
 * Each auto-arrange or one-click placement credits ~30s vs manual placement.
 * Persisted to localStorage per browser tab session.
 */
const KEY = "lovable:pallet-time-saved-seconds";
const SECONDS_PER_ITEM = 30;

const read = (): number => {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  } catch {
    return 0;
  }
};

const write = (seconds: number) => {
  try {
    sessionStorage.setItem(KEY, String(Math.max(0, Math.floor(seconds))));
  } catch {
    /* ignore */
  }
};

export const creditAutoPlacement = (itemCount: number) => {
  if (itemCount <= 0) return;
  write(read() + itemCount * SECONDS_PER_ITEM);
  // notify listeners
  try { window.dispatchEvent(new Event("lovable:pallet-time-saved")); } catch {}
};

export const getTimeSavedSeconds = (): number => read();

export const formatTimeSaved = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `~${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMin = mins % 60;
  return remMin ? `~${hrs}h ${remMin}m` : `~${hrs}h`;
};