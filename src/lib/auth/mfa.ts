/**
 * MFA / TOTP helpers
 * ------------------------------------------------------------------
 * Thin wrappers around `supabase.auth.mfa.*` to keep call sites
 * consistent and to centralize logging of identity events.
 *
 * Secrets handling:
 *  - The TOTP secret + QR code are surfaced ONCE during enrollment and
 *    are never persisted client-side outside the enrollment dialog state.
 *  - We never log codes, secrets, recovery values, or session tokens.
 */

import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent } from "@/lib/log-security-event";

export interface MfaFactorSummary {
  id: string;
  friendlyName: string | null;
  status: "verified" | "unverified";
  createdAt: string;
}

export interface EnrollResult {
  factorId: string;
  /** otpauth://… URI consumed by QR libraries. */
  uri: string;
  /** Base32 secret — shown once during enrollment, never persisted. */
  secret: string;
  qrCodeSvg: string;
}

/** Get summarized TOTP factors for the current user. */
export async function listVerifiedTotpFactors(): Promise<MfaFactorSummary[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return [];
  return (data.totp ?? []).map((f) => ({
    id: f.id,
    friendlyName: f.friendly_name ?? null,
    status: f.status as MfaFactorSummary["status"],
    createdAt: f.created_at,
  }));
}

/** True when the user has at least one verified TOTP factor. */
export async function hasVerifiedMfa(): Promise<boolean> {
  const factors = await listVerifiedTotpFactors();
  return factors.some((f) => f.status === "verified");
}

/** True when the current session has already satisfied an MFA challenge. */
export async function currentSessionIsAal2(): Promise<boolean> {
  const { data } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel === "aal2";
}

/**
 * Begin TOTP enrollment.
 * Returns the QR/secret material to display ONCE.
 */
export async function startTotpEnrollment(
  friendlyName = "Authenticator app",
): Promise<EnrollResult> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to start MFA enrollment");
  }
  await logSecurityEvent({
    event_type: "mfa_enroll_started",
    severity: "low",
    details: { factor_id: data.id },
  });
  return {
    factorId: data.id,
    uri: data.totp.uri,
    secret: data.totp.secret,
    qrCodeSvg: data.totp.qr_code,
  };
}

/** Verify the user-entered TOTP code to complete enrollment. */
export async function completeTotpEnrollment(
  factorId: string,
  code: string,
): Promise<void> {
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) {
    throw new Error(challenge.error?.message ?? "Failed to start challenge");
  }
  const verify = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: code.trim(),
  });
  if (verify.error) {
    throw new Error(verify.error.message);
  }
  await logSecurityEvent({
    event_type: "mfa_enroll_completed",
    severity: "low",
    details: { factor_id: factorId },
  });
}

/**
 * Challenge an existing verified TOTP factor and verify a code.
 * Used for sign-in step-up and step-up for sensitive actions.
 */
export async function challengeAndVerifyTotp(
  factorId: string,
  code: string,
): Promise<void> {
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) {
    throw new Error(challenge.error?.message ?? "Failed to start challenge");
  }
  const verify = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: code.trim(),
  });
  if (verify.error) throw new Error(verify.error.message);
}

/** Remove a TOTP factor (caller is expected to have stepped-up first). */
export async function unenrollTotpFactor(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw new Error(error.message);
  await logSecurityEvent({
    event_type: "mfa_disabled",
    severity: "high",
    details: { factor_id: factorId },
  });
}