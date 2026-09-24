/**
 * Password Policy — Phase 2 hardening
 * ------------------------------------------------------------------
 * Centralized validation for new passwords (signup, reset, change).
 *
 * Rules:
 *  - 12+ characters
 *  - Mix of uppercase, lowercase, number, symbol
 *  - Not a known weak/common pattern
 *  - Not the user's email local-part or display name
 *
 * HIBP / breached-password check is performed separately in
 * `src/lib/password-security.ts` and `supabase auth.password_hibp_enabled`.
 */

import { PASSWORD_BLOCKLIST, PASSWORD_MIN_LENGTH } from "@/config/security";

export interface PasswordPolicyResult {
  ok: boolean;
  /** Human-readable error suitable for showing in a toast / inline error. */
  message?: string;
  /** Strength score 0..4 — drives the strength meter. */
  score: 0 | 1 | 2 | 3 | 4;
}

interface PolicyContext {
  email?: string | null;
  displayName?: string | null;
}

const SEQUENTIAL_PATTERNS = [
  "0123456789",
  "abcdefghijklmnopqrstuvwxyz",
  "qwertyuiopasdfghjklzxcvbnm",
];

function containsSequential(pw: string): boolean {
  const lower = pw.toLowerCase();
  return SEQUENTIAL_PATTERNS.some((seq) => {
    for (let i = 0; i + 5 <= seq.length; i++) {
      if (lower.includes(seq.slice(i, i + 5))) return true;
    }
    return false;
  });
}

function rejectsContext(pw: string, ctx: PolicyContext): string | null {
  const lower = pw.toLowerCase();
  if (ctx.email) {
    const local = ctx.email.split("@")[0]?.toLowerCase() ?? "";
    if (local.length >= 4 && lower.includes(local)) {
      return "Don't include your email address in your password.";
    }
  }
  if (ctx.displayName) {
    const name = ctx.displayName.trim().toLowerCase();
    if (name.length >= 4 && lower.includes(name)) {
      return "Don't include your name in your password.";
    }
  }
  return null;
}

/** Pure strength scoring — 0 (empty) to 4 (strong). */
export function scorePassword(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let met = 0;
  if (pw.length >= PASSWORD_MIN_LENGTH) met++;
  if (/[A-Z]/.test(pw)) met++;
  if (/[a-z]/.test(pw)) met++;
  if (/[0-9]/.test(pw)) met++;
  if (/[^A-Za-z0-9]/.test(pw)) met++;
  if (met <= 2) return 1;
  if (met === 3) return 2;
  if (met === 4) return 3;
  return 4;
}

/**
 * Validate a candidate password against the full policy.
 * Returns a structured result — callers decide how to surface errors.
 */
export function validatePasswordPolicy(
  pw: string,
  ctx: PolicyContext = {},
): PasswordPolicyResult {
  const score = scorePassword(pw);

  if (pw.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      score,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }
  if (!/[A-Z]/.test(pw)) {
    return { ok: false, score, message: "Add an uppercase letter." };
  }
  if (!/[a-z]/.test(pw)) {
    return { ok: false, score, message: "Add a lowercase letter." };
  }
  if (!/[0-9]/.test(pw)) {
    return { ok: false, score, message: "Add a number." };
  }
  if (!/[^A-Za-z0-9]/.test(pw)) {
    return { ok: false, score, message: "Add a symbol." };
  }

  const lower = pw.toLowerCase();
  for (const banned of PASSWORD_BLOCKLIST) {
    if (lower.includes(banned)) {
      return {
        ok: false,
        score,
        message: "This password is too common — choose something unique.",
      };
    }
  }

  if (containsSequential(pw)) {
    return {
      ok: false,
      score,
      message: "Avoid long sequential patterns (like abcdef or 12345).",
    };
  }

  const ctxError = rejectsContext(pw, ctx);
  if (ctxError) return { ok: false, score, message: ctxError };

  return { ok: true, score };
}

/** Convenience boolean check for places that only need yes/no. */
export function isPasswordAcceptable(
  pw: string,
  ctx: PolicyContext = {},
): boolean {
  return validatePasswordPolicy(pw, ctx).ok;
}