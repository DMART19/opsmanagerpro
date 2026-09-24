/**
 * Step-up Authentication
 * ------------------------------------------------------------------
 * Verifies that the current user has recently proven identity before
 * allowing sensitive actions (delete workspace, change role, etc.).
 *
 * Strategy:
 *  1. If a verified MFA factor exists → require fresh TOTP challenge.
 *  2. Otherwise → require password re-entry via signInWithPassword.
 *
 * The most recent successful step-up timestamp is held in sessionStorage
 * so reloading the tab forces a fresh proof.
 */

import {
  STEP_UP_MAX_AGE_MINUTES,
  STEP_UP_TIMESTAMP_KEY,
  type SensitiveAction,
} from "@/config/security";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent } from "@/lib/log-security-event";
import {
  challengeAndVerifyTotp,
  listVerifiedTotpFactors,
} from "@/lib/auth/mfa";

export function readLastStepUp(): number {
  try {
    const raw = sessionStorage.getItem(STEP_UP_TIMESTAMP_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function recordStepUp() {
  try {
    sessionStorage.setItem(STEP_UP_TIMESTAMP_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function clearStepUp() {
  try {
    sessionStorage.removeItem(STEP_UP_TIMESTAMP_KEY);
  } catch {
    /* ignore */
  }
}

export function isStepUpFresh(): boolean {
  const last = readLastStepUp();
  if (!last) return false;
  return Date.now() - last < STEP_UP_MAX_AGE_MINUTES * 60_000;
}

export interface StepUpRequest {
  action: SensitiveAction;
  email: string;
  password?: string;
  totpCode?: string;
}

export interface StepUpDescriptor {
  /** Which proof the UI should collect. */
  method: "totp" | "password";
  /** Verified TOTP factor id when method is "totp". */
  factorId?: string;
}

/** Inspect the current user and decide which proof to ask for. */
export async function describeStepUp(): Promise<StepUpDescriptor> {
  const factors = await listVerifiedTotpFactors();
  const verified = factors.find((f) => f.status === "verified");
  if (verified) return { method: "totp", factorId: verified.id };
  return { method: "password" };
}

/**
 * Perform the actual proof and record success.
 * Never logs codes or passwords — only the action label and outcome.
 */
export async function performStepUp(req: StepUpRequest): Promise<void> {
  const descriptor = await describeStepUp();

  try {
    if (descriptor.method === "totp" && descriptor.factorId) {
      if (!req.totpCode) throw new Error("Authentication code is required.");
      await challengeAndVerifyTotp(descriptor.factorId, req.totpCode);
    } else {
      if (!req.password) throw new Error("Password is required.");
      const { error } = await supabase.auth.signInWithPassword({
        email: req.email,
        password: req.password,
      });
      if (error) throw new Error("Incorrect password.");
    }
  } catch (err) {
    await logSecurityEvent({
      event_type: "step_up_failed",
      severity: "medium",
      details: { action: req.action, method: descriptor.method },
    });
    throw err;
  }

  recordStepUp();
  await logSecurityEvent({
    event_type: "step_up_succeeded",
    severity: "low",
    details: { action: req.action, method: descriptor.method },
  });
}