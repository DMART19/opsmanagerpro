/**
 * Centralized application URL configuration.
 *
 * In production (published domain) we always use the canonical app domain.
 * In development / preview we fall back to the current origin so auth redirects
 * still work during local testing and Lovable previews.
 */

const PRODUCTION_DOMAIN = "https://opsmanagerpro.com";

/**
 * Returns the canonical application origin for use in auth redirects,
 * invite links, and email templates.
 */
export function getAppOrigin(): string {
  // In production, always use the canonical domain
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // If we're on the real domain, use it directly
    if (host === "opsmanagerpro.com" || host === "www.opsmanagerpro.com" || host === "fema-ops-hub.lovable.app") {
      return PRODUCTION_DOMAIN;
    }
  }

  // Fallback for local dev / preview environments
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return PRODUCTION_DOMAIN;
}

/**
 * Build a full URL path using the app origin.
 * e.g. getAppUrl("/reset-password") → "https://app.opsmanagerpro.com/reset-password"
 */
export function getAppUrl(path: string): string {
  return `${getAppOrigin()}${path}`;
}
