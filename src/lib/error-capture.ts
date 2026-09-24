/**
 * Centralized Error Capture Service
 * 
 * Captures errors from:
 * - Runtime errors (window.onerror)
 * - Unhandled promise rejections
 * - React error boundary
 * - API / Supabase errors (manual calls)
 * 
 * Features:
 * - Server-side dedup via upsert_error_log RPC (5-min window)
 * - Silent logging — no user-facing toasts
 * - Suppresses known transient errors (AbortError, auth race conditions)
 * - Breadcrumb trail: last 10 navigation + click + API events
 */

import { supabase } from "@/integrations/supabase/client";
import { recordApiMetric } from "@/lib/api-performance-tracker";

type Severity = "critical" | "error" | "warn" | "info";

interface ErrorCaptureParams {
  severity?: Severity;
  message: string;
  stack_trace?: string;
  page_route?: string;
  api_endpoint?: string;
  api_status_code?: number;
  request_method?: string;
  action_context?: {
    action: string;
    inputs?: Record<string, unknown>;
  };
}

// ─── Breadcrumb Tracker ───

export interface Breadcrumb {
  type: "navigation" | "click" | "api" | "custom";
  timestamp: string;
  data: string;
}

const MAX_BREADCRUMBS = 15;
const breadcrumbs: Breadcrumb[] = [];

function addBreadcrumb(type: Breadcrumb["type"], data: string) {
  breadcrumbs.push({
    type,
    timestamp: new Date().toISOString(),
    data: data.slice(0, 200),
  });
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
}

/** Record a navigation breadcrumb */
export function trackNavigation(from: string, to: string) {
  addBreadcrumb("navigation", `${from} → ${to}`);
}

/** Record a click breadcrumb */
export function trackClick(target: string) {
  addBreadcrumb("click", target);
}

/** Record an API call breadcrumb */
export function trackApiCall(method: string, endpoint: string, status: number) {
  addBreadcrumb("api", `${method} ${endpoint} → ${status}`);
}

/** Record a custom breadcrumb */
export function trackCustom(label: string) {
  addBreadcrumb("custom", label);
}

/** Get current breadcrumbs snapshot */
export function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbs];
}

// App version — derived from build time
const APP_BUILD_ID = `${import.meta.env.MODE}-${new Date().toISOString().slice(0, 10)}`;

function buildReplayBundle() {
  return {
    app_version: APP_BUILD_ID,
    breadcrumbs: getBreadcrumbs(),
    captured_at: new Date().toISOString(),
    url: window.location.href,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  };
}

// ─── Auto-track navigation via History API ───

let lastPathname = typeof window !== "undefined" ? window.location.pathname : "/";

function installNavigationTracker() {
  // Intercept pushState / replaceState
  const origPush = history.pushState;
  const origReplace = history.replaceState;

  history.pushState = function (...args) {
    const result = origPush.apply(this, args);
    const newPath = window.location.pathname;
    if (newPath !== lastPathname) {
      trackNavigation(lastPathname, newPath);
      lastPathname = newPath;
    }
    return result;
  };

  history.replaceState = function (...args) {
    const result = origReplace.apply(this, args);
    const newPath = window.location.pathname;
    if (newPath !== lastPathname) {
      trackNavigation(lastPathname, newPath);
      lastPathname = newPath;
    }
    return result;
  };

  window.addEventListener("popstate", () => {
    const newPath = window.location.pathname;
    if (newPath !== lastPathname) {
      trackNavigation(lastPathname, newPath);
      lastPathname = newPath;
    }
  });
}

// ─── Auto-track major clicks ───

function installClickTracker() {
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (!target) return;
    // Only track buttons, links, and interactive elements
    const el = target.closest("button, a, [role='button'], [role='tab'], [role='menuitem']");
    if (!el) return;
    const label =
      (el as HTMLElement).textContent?.trim().slice(0, 60) ||
      el.getAttribute("aria-label") ||
      el.tagName.toLowerCase();
    trackClick(`${el.tagName.toLowerCase()}: "${label}"`);
  }, { capture: true, passive: true });
}

// ─── Suppression / Rate Limiting ───

const SUPPRESSED_PATTERNS = [
  "AbortError",
  "signal is aborted",
  "Lock broken by another request",
  "steal",
  "timed out",
  "Failed to fetch",
  "Load failed",
  "NetworkError",
  "ResizeObserver loop",
];

function shouldSuppress(message: string): boolean {
  return SUPPRESSED_PATTERNS.some((p) =>
    message.toLowerCase().includes(p.toLowerCase())
  );
}

function generateHash(severity: string, message: string, route: string): string {
  const raw = `${severity}:${message.slice(0, 120)}:${route}`;
  try {
    return btoa(unescape(encodeURIComponent(raw))).slice(0, 64);
  } catch {
    return btoa(raw.replace(/[^\\x00-\\x7F]/g, "")).slice(0, 64);
  }
}

let cachedUserId: string | null = null;
let cachedUserEmail: string | null = null;
let userIdFetched = false;

async function getUserId(): Promise<string | null> {
  // Always refresh from centralized auth state
  const user = getCurrentUser();
  if (user) {
    cachedUserId = user.id;
    cachedUserEmail = user.email || null;
    cachedWorkspaceId = user.id;
    userIdFetched = true;
    return cachedUserId;
  }
  if (userIdFetched) return cachedUserId;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    cachedUserId = session?.user?.id || null;
    cachedUserEmail = session?.user?.email || null;
    cachedWorkspaceId = cachedUserId;
    userIdFetched = true;
  } catch {
    cachedUserId = null;
    cachedUserEmail = null;
  }
  return cachedUserId;
}

// Auth state is updated via getCurrentUser() from use-auth-state.ts
// No standalone onAuthStateChange listener here — prevents leaked subscriptions
import { getCurrentUser } from "@/hooks/use-auth-state";

// Patch getUserId to use centralized auth
async function refreshUserFromAuthState() {
  const user = getCurrentUser();
  cachedUserId = user?.id || null;
  cachedUserEmail = user?.email || null;
  cachedWorkspaceId = user?.id || null;
  userIdFetched = !!user;
}

let logCount = 0;
let logWindowStart = Date.now();
const MAX_LOGS_PER_MINUTE = 10;

function isRateLimited(): boolean {
  const now = Date.now();
  if (now - logWindowStart > 60_000) {
    logCount = 0;
    logWindowStart = now;
  }
  if (logCount >= MAX_LOGS_PER_MINUTE) return true;
  logCount++;
  return false;
}

// ─── Main Capture ───

export async function captureError(params: ErrorCaptureParams): Promise<void> {
  const {
    severity = "error",
    message,
    stack_trace,
    page_route,
    api_endpoint,
    api_status_code,
    request_method,
    action_context,
  } = params;

  if (shouldSuppress(message)) return;
  if (isRateLimited()) return;

  try {
    const userId = await getUserId();
    const route = page_route || window.location.pathname;
    const browserInfo = navigator.userAgent.slice(0, 250);
    const errorHash = generateHash(severity, message, route);
    const replayBundle = buildReplayBundle();

    // Sanitize action_context inputs: strip long values and sensitive fields
    let sanitizedContext: Record<string, unknown> | null = null;
    if (action_context) {
      const SENSITIVE_KEYS = [
        "password", "token", "secret", "credit_card", "ssn", "api_key",
        "certification_number", "serial_number", "document_url",
        "authorization", "credential", "card_number", "social_security",
      ];
      const sanitized: Record<string, unknown> = {};
      if (action_context.inputs) {
        for (const [key, val] of Object.entries(action_context.inputs)) {
          if (SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk))) {
            sanitized[key] = "[REDACTED]";
          } else if (typeof val === "string" && val.length > 200) {
            sanitized[key] = val.slice(0, 200) + "…";
          } else {
            sanitized[key] = val;
          }
        }
      }
      sanitizedContext = { action: action_context.action, inputs: sanitized };
    }

    await supabase.rpc("upsert_error_log" as any, {
      p_user_id: userId,
      p_severity: severity,
      p_message: message.slice(0, 2000),
      p_stack_trace: stack_trace?.slice(0, 5000) || null,
      p_page_route: route,
      p_browser_info: browserInfo,
      p_api_endpoint: api_endpoint?.slice(0, 500) || null,
      p_api_status_code: api_status_code || null,
      p_request_method: request_method?.slice(0, 10) || null,
      p_error_hash: errorHash,
      p_replay_bundle: replayBundle,
      p_workspace_id: cachedWorkspaceId,
      p_user_email: cachedUserEmail,
      p_action_context: sanitizedContext,
    });
  } catch {
    // Silently fail — never create error loops
  }
}

/** Capture an error with action context for easy reproduction */
export function captureErrorWithContext(
  action: string,
  inputs: Record<string, unknown>,
  error: Error | string,
  severity: Severity = "error"
): void {
  const message = error instanceof Error ? error.message : error;
  const stack = error instanceof Error ? error.stack : undefined;
  captureError({
    severity,
    message,
    stack_trace: stack,
    action_context: { action, inputs },
  });
}

export function captureApiError(
  endpoint: string,
  method: string,
  statusCode: number,
  errorMessage: string,
  severity: Severity = statusCode >= 500 ? "critical" : "error"
): void {
  // Also track as breadcrumb
  trackApiCall(method, endpoint, statusCode);

  captureError({
    severity,
    message: `API ${method} ${endpoint}: ${errorMessage}`,
    api_endpoint: endpoint,
    api_status_code: statusCode,
    request_method: method,
  });
}

export function captureReactError(error: Error, componentStack?: string): void {
  captureError({
    severity: "critical",
    message: `React Error: ${error.message}`,
    stack_trace: [error.stack, componentStack ? `\nComponent Stack:${componentStack}` : ""]
      .filter(Boolean)
      .join("\n"),
  });
}

// ─── Toast Interception ───

function installToastInterceptor() {
  // Dynamically patch sonner toast.error and toast.warning
  import("sonner").then(({ toast }) => {
    const origError = toast.error;
    const origWarning = toast.warning;

    toast.error = ((message: any, ...args: any[]) => {
      const text = typeof message === "string" ? message : String(message ?? "Unknown toast error");
      captureError({
        severity: "error",
        message: `Toast Error: ${text}`,
        page_route: window.location.pathname,
      });
      return (origError as any)(message, ...args);
    }) as typeof toast.error;

    toast.warning = ((message: any, ...args: any[]) => {
      const text = typeof message === "string" ? message : String(message ?? "Unknown toast warning");
      captureError({
        severity: "warn",
        message: `Toast Warning: ${text}`,
        page_route: window.location.pathname,
      });
      return (origWarning as any)(message, ...args);
    }) as typeof toast.warning;
  }).catch(() => {
    // sonner not available — skip
  });
}

// ─── Supabase Fetch Interceptor ───

function installSupabaseFetchInterceptor() {
  const originalFetch = window.fetch;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return;

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url;
    const isSupabase = url && url.startsWith(supabaseUrl);
    const fetchStart = isSupabase ? performance.now() : 0;

    const response = await originalFetch(...args);

    // Record performance metric for all Supabase calls
    if (isSupabase && url) {
      const latencyMs = Math.round(performance.now() - fetchStart);
      const tableName = url.replace(supabaseUrl, "").match(/\/rest\/v1\/([^?/]+)/)?.[1];
      const method = (args[1] as RequestInit)?.method || "GET";
      recordApiMetric({
        endpoint: tableName || url.slice(0, 80),
        method,
        statusCode: response.status,
        latencyMs,
        timestamp: Date.now(),
        isError: !response.ok,
      });
    }

    // Only capture errors for Supabase REST API calls
    if (!isSupabase || !url) return response;
    if (response.ok) return response;

    // Clone so body is still consumable by caller
    try {
      const clone = response.clone();
      const body = await clone.json().catch(() => null);
      if (body && (body.message || body.error)) {
        const errMsg = body.message || body.error || "Unknown API error";
        const code = body.code || String(response.status);
        const tableName = url.replace(supabaseUrl, "").match(/\/rest\/v1\/([^?/]+)/)?.[1];

        // Skip fire-and-forget tables that gracefully handle failures (e.g. read-only workspaces)
        const SILENT_TABLES = ["data_access_logs", "user_notifications", "product_events", "friction_events"];
        if (tableName && SILENT_TABLES.includes(tableName) && String(code) === "25006") {
          return response;
        }

        captureError({
          severity: response.status >= 500 ? "critical" : "error",
          message: `API [${code}]${tableName ? ` on ${tableName}` : ""}: ${errMsg}`,
          stack_trace: body.details
            ? `Details: ${body.details}${body.hint ? `\nHint: ${body.hint}` : ""}`
            : undefined,
          api_endpoint: tableName || url.slice(0, 200),
          api_status_code: response.status,
          request_method: (args[1] as RequestInit)?.method || "GET",
        });

        trackApiCall(
          (args[1] as RequestInit)?.method || "GET",
          tableName || url.slice(0, 80),
          response.status
        );
      }
    } catch {
      // Never break the original request
    }

    return response;
  };
}

// ─── Workspace Context ───

let cachedWorkspaceId: string | null = null;

export function setWorkspaceId(id: string | null) {
  cachedWorkspaceId = id;
}

export function getWorkspaceId(): string | null {
  return cachedWorkspaceId;
}

// ─── Global Handlers (install once) ───

let installed = false;

export function installGlobalErrorHandlers(): void {
  if (installed) return;
  installed = true;

  // Install breadcrumb trackers
  installNavigationTracker();
  installClickTracker();

  // Install toast error interception
  installToastInterceptor();

  // Install Supabase fetch interceptor
  installSupabaseFetchInterceptor();

  // Runtime errors
  const prevOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const msg = typeof message === "string" ? message : String(message);
    captureError({
      severity: "error",
      message: msg,
      stack_trace: error?.stack || `at ${source}:${lineno}:${colno}`,
    });
    if (prevOnError) {
      return (prevOnError as any)(message, source, lineno, colno, error);
    }
    return false;
  };

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
        ? reason
        : "Unhandled promise rejection";
    const stack = reason instanceof Error ? reason.stack : undefined;

    captureError({
      severity: "error",
      message: `Unhandled Rejection: ${message}`,
      stack_trace: stack,
    });
  });
}
