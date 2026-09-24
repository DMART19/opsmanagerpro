# HttpOnly Cookie Session Migration Plan

_Phase 2 deliverable — OpsManagerPro security hardening roadmap._

## 1. Current state

- Frontend: Vite + React SPA, served statically (Lovable / Cloudflare CDN).
- Auth provider: Supabase Cloud (GoTrue).
- Token storage: `localStorage` via `@supabase/supabase-js` default.
- Token contents: JWT access token (~1 h lifetime) + refresh token.
- Session refresh: handled in-browser by the Supabase client (`autoRefreshToken: true`).
- No first-party backend currently sits between the browser and Supabase.

## 2. Risks of `localStorage` token storage

| Risk | Description |
|------|-------------|
| XSS exfiltration | Any successful XSS can read the access + refresh token. |
| Long-lived refresh tokens | Refresh tokens can outlive the user's awareness if exfiltrated. |
| Cross-origin reuse | Tokens carried in `Authorization` headers are subject to JS access. |
| No CSRF protection by design | OK today (because we don't use cookies) — but means we have no defense-in-depth either. |

## 3. Proposed architecture

Introduce a thin **auth proxy** in front of Supabase:

```
browser ──HTTPS──▶ auth-proxy (edge / serverless) ──▶ Supabase Auth + REST + RPC
            ▲                         │
            └── HttpOnly Secure SameSite=Lax cookies
```

The proxy:

- terminates `/auth/*` endpoints and exchanges credentials for Supabase tokens server-side,
- stores access token in a short-lived (`Max-Age` = 15 min) HttpOnly cookie,
- stores refresh token in a long-lived (`Max-Age` = 7 d) HttpOnly cookie with `Path=/auth/refresh`,
- attaches `Authorization: Bearer …` server-side before forwarding API calls,
- handles silent refresh via a `POST /auth/refresh` route guarded by a CSRF token.

Edge candidates: Supabase Edge Functions (Deno), Cloudflare Workers, or a small Hono service on Fly.io / Render.

## 4. Required backend / edge changes

- New routes: `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/oauth/callback`, `/auth/session`.
- Proxy endpoints under `/api/*` that forward to Supabase REST + RPC.
- Updated edge functions (already hardened in Phase 1) to accept cookie-bearing requests in addition to `Authorization` headers during transition.
- Replace the Supabase JS client's default storage with a no-op storage and disable `persistSession` once the proxy is live.

## 5. CSRF requirements

- Issue a **double-submit cookie** CSRF token alongside the session cookie on login (e.g. `omp_csrf=<random>`).
- Require the same value in a request header (`X-CSRF-Token`) on every mutating method (POST/PUT/PATCH/DELETE).
- Cookie attributes: `Secure; SameSite=Lax; HttpOnly` for session cookies; `Secure; SameSite=Lax` (readable) for the CSRF cookie.
- Reject mismatched / missing CSRF tokens with HTTP 403.

## 6. SameSite cookie strategy

| Cookie | HttpOnly | Secure | SameSite | Path |
|--------|---------|--------|----------|------|
| `omp_access` | ✅ | ✅ | `Lax` | `/` |
| `omp_refresh` | ✅ | ✅ | `Strict` | `/auth/refresh` |
| `omp_csrf` | ❌ (readable) | ✅ | `Lax` | `/` |

`SameSite=Lax` is required for OAuth callback flows. `Strict` is reserved for the refresh-only endpoint.

## 7. Session refresh strategy

- Client schedules a silent `fetch('/auth/refresh', { method: 'POST', credentials: 'include' })` ~60 s before access cookie expiry.
- Refresh endpoint rotates the refresh token, sets a new `omp_access` cookie, and returns `{ ok: true }`.
- On failure (token revoked / expired), the client redirects to `/auth`.

## 8. Logout behavior

- `POST /auth/logout` clears `omp_access`, `omp_refresh`, and `omp_csrf` (Max-Age=0) and calls `supabase.auth.admin.signOut` for the session.
- Client clears its in-memory query cache and redirects to `/`.

## 9. Migration phases

1. **Phase 2 (this release):** document plan, lock down storage usage, ensure no manual token reads.
2. **Phase 2.5:** stand up `auth-proxy` in staging; add feature flag `USE_COOKIE_SESSIONS=false` (default).
3. **Phase 3:** dual-write — keep `localStorage` for backward compat while the proxy issues cookies; verify telemetry.
4. **Phase 3.5:** flip flag to `true` for internal users; monitor for regressions.
5. **Phase 4:** disable Supabase JS persistence, remove `localStorage` tokens, sunset legacy path.

## 10. Rollback plan

- Single feature flag (`USE_COOKIE_SESSIONS`) gates the entire migration.
- The proxy keeps a "passthrough" mode that proxies to Supabase without touching cookies — if cookies break, redeploy with passthrough on.
- `localStorage` storage stays available for one full release after cutover so users can revert without re-authenticating.

## 11. Risks & open questions

- **OAuth flows:** Google / Apple sign-in callbacks must terminate on the proxy origin (not Supabase) to set first-party cookies.
- **Subdomain access:** if we ever serve from `app.example.com`, `auth-proxy` must live on `example.com` or an apex-eligible domain to share cookies.
- **Edge runtime cost:** every API request adds a proxy hop. Need latency budget review.
- **Long-running tabs:** silent refresh must keep working even when tabs are backgrounded — investigate `navigator.sendBeacon` fallbacks.
- **CSP tightening:** post-migration we can adopt a stricter CSP (no `'unsafe-inline'`) because tokens no longer require JS access.

## 12. Definition of done

- All authenticated API traffic carries identity via HttpOnly cookies.
- `localStorage` contains no auth tokens for new sessions.
- CSRF tokens are validated on every state-changing request.
- Logout reliably revokes refresh tokens server-side.
- Rollback path verified in a staging incident drill.