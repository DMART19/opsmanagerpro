# Phase 2 — Identity & Session Security Summary

_OpsManagerPro security hardening roadmap._

## What shipped

- **MFA (TOTP)** enrollment, verification, unenrollment, and sign-in challenge.
- **Step-up authentication** for sensitive identity actions (password change, MFA changes, more wired progressively).
- **Session timeout engine** — sliding idle timeout + absolute session length, with a warning dialog.
- **Password policy** — 12+ chars, blocklist, sequential-pattern check, email/name guard, HIBP server-side (enabled in Supabase Auth config) + client breach check.
- **Account Security tab** redesigned with real MFA controls, session policy display, and warnings for un-enrolled admins.
- **Super-admin route guard** now requires MFA when `REQUIRE_MFA_FOR_ADMINS` is on.
- **Audit logging** for identity events (`mfa_enroll_started`, `mfa_enroll_completed`, `mfa_disabled`, `mfa_challenge_failed`, `password_changed`, `step_up_*`, `session_*_timeout`, `privileged_access_*`).
- **Token storage documentation** — comments in `supabase/client.ts` and migration plan at `docs/security/http-only-cookie-session-migration.md`.

## Configuration

All knobs live in [`src/config/security.ts`](../../src/config/security.ts):

| Constant | Default | Purpose |
|----------|---------|---------|
| `REQUIRE_MFA_FOR_ADMINS` | `true` | Block `SuperAdminRoute` until MFA is enrolled |
| `REQUIRE_MFA_FOR_WORKSPACE_OWNERS` | `false` | Reserved for workspace-owner enforcement |
| `REQUIRE_MFA_FOR_ALL_USERS` | `false` | Optional global MFA push |
| `REGULATED_MODE_ENABLED` | `false` | Tightens timeouts + step-up window |
| `IDLE_TIMEOUT_MINUTES` | `60` (15 in regulated) | Idle auto sign-out |
| `IDLE_WARNING_SECONDS` | `60` | Pre-logout warning window |
| `ABSOLUTE_SESSION_HOURS` | `24` (8 in regulated) | Hard ceiling on a session |
| `STEP_UP_MAX_AGE_MINUTES` | `15` (5 in regulated) | Re-auth required after this idle window |

## How to require step-up in new actions

```ts
import { useStepUp } from "@/hooks/use-step-up";
import { SENSITIVE_ACTIONS } from "@/config/security";

const { require, dialogProps } = useStepUp();

const handleDangerous = async () => {
  await require(SENSITIVE_ACTIONS.DELETE_WORKSPACE); // throws if cancelled
  await doTheThing();
};

return <>… <StepUpAuthDialog {...dialogProps} /></>;
```

## Supabase dashboard tasks (manual)

- ✅ `password_hibp_enabled: true` (set via Lovable's auth config tool).
- ⏳ Review password length minimums in Supabase Auth → Policies (set to 12 to match client).
- ⏳ Confirm MFA factor type "TOTP" is enabled in Supabase Auth → Multi-factor.

## Out of scope for Phase 2

- HttpOnly cookie session migration (plan only — see migration doc).
- WebAuthn / passkeys (Phase 3 candidate).
- Per-IP / per-device risk scoring.
- Recovery codes UI (Supabase doesn't expose TOTP recovery codes via JS; manual admin reset only).
- Workspace-owner MFA enforcement (flag exists; gating UI not yet wired).

## Manual QA checklist

- [ ] Sign up with a 12+ char password → succeeds. 8-char password is rejected.
- [ ] Strength meter reflects requirements as you type.
- [ ] Existing user signs in → reaches `/dashboard`.
- [ ] Enroll MFA from Settings → Security: QR shows, code accepted, badge flips to "Enabled".
- [ ] Sign out + sign in again → MFA challenge dialog appears, code accepted, lands on dashboard.
- [ ] Disable MFA → step-up prompt appears, password (or current TOTP) verifies, MFA removed.
- [ ] Change password → step-up prompt appears, password updated, success toast.
- [ ] Super-admin without MFA → redirected to `/settings?tab=security&mfa=required`.
- [ ] Idle 14 min → warning dialog at 60 s remaining; "Stay signed in" keeps you logged in; otherwise you are signed out at 15 min.
- [ ] No console output contains tokens, codes, or secrets (`grep -i "token\|totp\|secret"` in DevTools console).
- [ ] Forgot password flow still completes end-to-end.

## Phase 3 recommendations

1. Stand up the auth proxy and execute the HttpOnly cookie migration.
2. Add WebAuthn / passkey support as a second MFA factor.
3. Add device/session listing (Supabase Admin API) with per-device revoke.
4. Per-org MFA policies (admin-configurable, not just code-flagged).
5. Risk-based step-up: trigger on geo-velocity, new device, or new ASN.
6. Wire step-up into remaining sensitive actions (delete workspace, billing, role changes, exports, founder console).
7. Forward identity events into the central SIEM / alerting pipeline.