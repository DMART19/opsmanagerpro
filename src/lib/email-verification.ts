import type { User } from "@supabase/supabase-js";

const PENDING_VERIFICATION_EMAIL_KEY = "pending_verification_email";

export function isEmailVerified(user: User | null | undefined): boolean {
  if (!user) return false;

  const candidate = user as User & {
    email_confirmed_at?: string | null;
    confirmed_at?: string | null;
  };

  return Boolean(candidate.email_confirmed_at ?? candidate.confirmed_at);
}

export function setPendingVerificationEmail(email: string) {
  try {
    sessionStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    // ignore
  }
}

export function getPendingVerificationEmail(): string {
  try {
    return sessionStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearPendingVerificationEmail() {
  try {
    sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
  } catch {
    // ignore
  }
}
