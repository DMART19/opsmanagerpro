/**
 * Platform-wide rate limiter.
 * Client-side guard — NOT a replacement for server-side enforcement.
 * Uses sessionStorage so limits reset on tab close (intentional UX choice).
 */

// ─── Storage Layer ───

interface RateLimitEntry {
  attempts: number[];
}

const STORAGE_PREFIX = "rl_";

function getEntry(key: string): RateLimitEntry {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { attempts: [] };
}

function setEntry(key: string, entry: RateLimitEntry) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch { /* ignore */ }
}

// ─── Core API ───

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
}

/**
 * Check if an action is rate-limited.
 * @param key - Unique key per action (e.g. "login", "asset_create")
 * @param maxAttempts - Max attempts in the window
 * @param windowMs - Time window in ms
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 5 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const entry = getEntry(key);

  // Prune expired attempts
  entry.attempts = entry.attempts.filter(t => now - t < windowMs);

  if (entry.attempts.length >= maxAttempts) {
    const oldest = entry.attempts[0];
    const retryAfterMs = windowMs - (now - oldest);
    setEntry(key, entry);
    return { allowed: false, retryAfterMs, remaining: 0 };
  }

  setEntry(key, entry);
  return { allowed: true, retryAfterMs: 0, remaining: maxAttempts - entry.attempts.length };
}

/**
 * Record an attempt. Call AFTER checkRateLimit returns allowed: true.
 */
export function recordAttempt(key: string, windowMs = 5 * 60 * 1000) {
  const now = Date.now();
  const entry = getEntry(key);
  entry.attempts = entry.attempts.filter(t => now - t < windowMs);
  entry.attempts.push(now);
  setEntry(key, entry);
}

/**
 * Clear all recorded attempts for a key.
 * Call on successful login to reset the failed-attempt counter.
 */
export function clearAttempts(key: string) {
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + key);
  } catch { /* ignore */ }
}

/**
 * Format remaining cooldown for display.
 */
export function formatCooldown(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds <= 60) return `${seconds} seconds`;
  const minutes = Math.ceil(ms / 60000);
  if (minutes <= 1) return "a minute";
  return `${minutes} minutes`;
}

// ─── Preconfigured Limiters ───

export type RateLimitAction =
  | "login"
  | "signup"
  | "reset"
  | "invite"
  | "asset_create"
  | "asset_edit"
  | "search"
  | "export"
  | "bulk_operation";

interface LimitConfig {
  maxAttempts: number;
  windowMs: number;
  message: string;
}

const LIMIT_CONFIGS: Record<RateLimitAction, LimitConfig> = {
  // Auth: strict limits
  login:          { maxAttempts: 5,  windowMs: 10 * 60_000, message: "Too many login attempts. Please try again later." },
  signup:         { maxAttempts: 5,  windowMs: 5 * 60_000, message: "Too many signup attempts. Please wait a few minutes." },
  reset:          { maxAttempts: 3,  windowMs: 5 * 60_000, message: "Too many password reset requests. Please wait." },

  // Workspace: moderate limits
  invite:         { maxAttempts: 20, windowMs: 60_000,     message: "Too many invite requests. Please slow down." },
  asset_create:   { maxAttempts: 100, windowMs: 60_000,    message: "Asset creation rate limit reached. Please wait a moment." },
  asset_edit:     { maxAttempts: 120, windowMs: 60_000,    message: "Too many edit operations. Please wait a moment." },

  // Search: generous but bounded
  search:         { maxAttempts: 50, windowMs: 60_000,     message: "Search rate limit reached. Please wait a moment." },

  // Export: prevent abuse
  export:         { maxAttempts: 5,  windowMs: 5 * 60_000, message: "Too many export requests. Please wait before exporting again." },

  // Bulk operations
  bulk_operation: { maxAttempts: 10, windowMs: 60_000,     message: "Too many bulk operations. Please wait a moment." },
};

/**
 * Check a preconfigured rate limit by action name.
 * Returns the result and error message if blocked.
 */
export function checkActionLimit(action: RateLimitAction): RateLimitResult & { message: string } {
  const config = LIMIT_CONFIGS[action];
  const result = checkRateLimit(action, config.maxAttempts, config.windowMs);
  return { ...result, message: config.message };
}

/**
 * Record an attempt for a preconfigured action.
 */
export function recordActionAttempt(action: RateLimitAction) {
  const config = LIMIT_CONFIGS[action];
  recordAttempt(action, config.windowMs);
}

/**
 * Combined check-and-record: throws if rate-limited.
 * Use in async flows where you want a simple guard.
 */
export function enforceRateLimit(action: RateLimitAction): void {
  const { allowed, message, retryAfterMs } = checkActionLimit(action);
  if (!allowed) {
    const cooldown = formatCooldown(retryAfterMs);
    throw new RateLimitError(`${message} Try again in ${cooldown}.`, retryAfterMs);
  }
  recordActionAttempt(action);
}

export class RateLimitError extends Error {
  retryAfterMs: number;
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

// Legacy exports for backward compatibility
export const RATE_LIMIT_MESSAGE = "Too many login attempts. Please try again later.";
