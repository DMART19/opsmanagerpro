/**
 * Production Logger
 * ------------------------------------------------------------------
 * In production builds, mutes console.log / .info / .debug and routes
 * console.warn / .error through the centralized error-capture pipeline
 * so they end up in `error_logs` instead of leaking to end-user devtools.
 *
 * Dev builds are untouched.
 *
 * Call `installProdLogger()` once at app startup, AFTER error-capture is
 * ready (or standalone — it degrades gracefully if capture is absent).
 */

import { sanitizeForLogging } from "@/lib/data-security";

let installed = false;

export function installProdLogger(): void {
  if (installed) return;
  installed = true;

  if (import.meta.env.DEV) return;

  const noop = () => {};
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  // Silence chatty channels in production
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.trace = noop;

  const forward = (
    level: "warn" | "error",
    original: (...args: unknown[]) => void,
  ) =>
    ((...args: unknown[]) => {
      try {
        const safe = args.map((a) =>
          a && typeof a === "object"
            ? sanitizeForLogging(a as Record<string, unknown>)
            : a,
        );
        // Keep a single terse original call so uncaught frameworks (React,
        // Sentry-style tools) still see something, but strip sensitive payloads.
        original(`[${level}]`, ...safe);
      } catch {
        // Never let logging throw.
      }
    }) as typeof console.warn;

  console.warn = forward("warn", originalWarn);
  console.error = forward("error", originalError);
}