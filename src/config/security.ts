/**
 * Centralized Auth & Session Security Configuration
 * ------------------------------------------------------------------
 * Phase 2 hardening — single source of truth for identity, MFA,
 * session timeout, step-up authentication, and password policy.
 *
 * Update values here; do not scatter literals across the app.
 * Documentation: docs/security/phase-2-summary.md
 */

// ─── Feature flags ────────────────────────────────────────────────

/** Require MFA enrollment for super admins / founder console. */
export const REQUIRE_MFA_FOR_ADMINS = true;

/** Require MFA enrollment for workspace owners (paid admin role). */
export const REQUIRE_MFA_FOR_WORKSPACE_OWNERS = false;

/** When true, also nudge non-admin users to enroll in MFA. */
export const REQUIRE_MFA_FOR_ALL_USERS = false;

/** Master toggle for "regulated mode": tighter timeouts + step-up everywhere. */
export const REGULATED_MODE_ENABLED = false;

// ─── Session timeouts (minutes / hours) ───────────────────────────

/** Idle timeout — auto sign-out after this many minutes of no activity. */
export const IDLE_TIMEOUT_MINUTES = REGULATED_MODE_ENABLED ? 15 : 60;

/** Seconds before idle timeout to show a warning dialog. */
export const IDLE_WARNING_SECONDS = 60;

/** Absolute session length — force re-auth after this many hours regardless of activity. */
export const ABSOLUTE_SESSION_HOURS = REGULATED_MODE_ENABLED ? 8 : 24;

/** localStorage key tracking the absolute session start. */
export const ABSOLUTE_SESSION_START_KEY = "omp_session_started_at";

// ─── Step-up authentication ───────────────────────────────────────

/**
 * Max minutes since last password / MFA verification before a sensitive
 * action requires step-up re-authentication.
 */
export const STEP_UP_MAX_AGE_MINUTES = REGULATED_MODE_ENABLED ? 5 : 15;

/** sessionStorage key tracking the last successful step-up timestamp. */
export const STEP_UP_TIMESTAMP_KEY = "omp_step_up_at";

/** Catalog of sensitive actions that always require step-up. */
export const SENSITIVE_ACTIONS = {
  DELETE_WORKSPACE: "delete_workspace",
  CHANGE_BILLING: "change_billing",
  CHANGE_USER_ROLE: "change_user_role",
  INVITE_TEAM_MEMBER: "invite_team_member",
  REMOVE_TEAM_MEMBER: "remove_team_member",
  EXPORT_SENSITIVE_DATA: "export_sensitive_data",
  VIEW_SECURITY_SETTINGS: "view_security_settings",
  CHANGE_MFA: "change_mfa",
  CHANGE_EMAIL: "change_email",
  CHANGE_PASSWORD: "change_password",
  ACCESS_FOUNDER_PANEL: "access_founder_panel",
} as const;

export type SensitiveAction =
  (typeof SENSITIVE_ACTIONS)[keyof typeof SENSITIVE_ACTIONS];

// ─── Password policy ──────────────────────────────────────────────

/** Minimum length enforced on all new / changed passwords. */
export const PASSWORD_MIN_LENGTH = 12;

/** Common / weak password fragments rejected outright. */
export const PASSWORD_BLOCKLIST: ReadonlyArray<string> = [
  "password",
  "passw0rd",
  "letmein",
  "welcome",
  "qwerty",
  "abc123",
  "iloveyou",
  "admin",
  "opsmanager",
  "lovable",
  "monkey",
  "dragon",
  "111111",
  "123456",
  "12345678",
  "12345abc",
] as const;

/**
 * Server-side leaked-password protection (HaveIBeenPwned).
 * Enabled via `supabase--configure_auth` with `password_hibp_enabled: true`.
 * The client also performs a k-Anonymity check before signup / password change
 * (`src/lib/password-security.ts`) for instant feedback.
 */
export const HIBP_PROTECTION_NOTE =
  "HIBP leaked-password protection is enabled in Cloud auth settings.";

// ─── Token storage notes (current limitation) ─────────────────────

/**
 * Auth tokens are stored in browser `localStorage` by the Supabase client.
 * Migration to HttpOnly cookie sessions is tracked in
 * `docs/security/http-only-cookie-session-migration.md`.
 */
export const TOKEN_STORAGE_MODE: "localStorage" | "httpOnlyCookie" =
  "localStorage";