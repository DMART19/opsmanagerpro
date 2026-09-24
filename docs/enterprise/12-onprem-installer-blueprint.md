# 12 — On-Prem Enterprise Installer Blueprint

Forward-looking blueprint for a downloadable **OpsManagerPro Enterprise Installer**. Not a today-project. Documented so today's SaaS decisions do not foreclose this path.

## Design premises

1. **Same codebase as SaaS.** No fork. Deployment mode is env-driven.
2. **Customer owns everything operational.** Data, backups, credentials, uptime.
3. **No auto-update.** Updates are signed packages installed manually by the customer's IT team.
4. **No phone-home requirement.** The system must run in a truly air-gapped network with no outbound connectivity.
5. **Licensing separate from data.** Expired license → read-only; never delete.
6. **Windows Server and Linux both supported.** Same container images; different install harness.

## Deployment shape (reference stack)

```text
┌─ Docker host (Windows Server 2022 or Linux) ─────────────────┐
│                                                              │
│  ┌──────────────────┐   ┌──────────────────┐                 │
│  │ omp-web          │   │ omp-edge         │                 │
│  │ (nginx + SPA)    │   │ (Deno runtime,   │                 │
│  │ TLS terminated   │   │  edge functions) │                 │
│  └────────┬─────────┘   └────────┬─────────┘                 │
│           │                       │                          │
│           └──────────┬────────────┘                          │
│                      │                                       │
│  ┌───────────────────┴────────────┐   ┌────────────────────┐ │
│  │  postgres 15+                  │   │ MinIO (S3)         │ │
│  │  (RLS + omp schema + migs)     │   │ or NAS mount       │ │
│  │  WAL archive → /backups        │   │ or Azure Blob      │ │
│  └────────────────────────────────┘   └────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ omp-mail-relay (optional SMTP relay to customer mail)   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  License file (mounted, signed .json)                        │
│  Update tool: `omp-update` (Windows service or systemd unit) │
└──────────────────────────────────────────────────────────────┘
```

## What must exist in the codebase for on-prem to work

The following items are **not** in the codebase today. Each is a distinct workstream:

1. **`Dockerfile.web`, `Dockerfile.edge`, `docker-compose.yml`** with pinned versions.
2. **`omp-postgres` init image** with schema baseline (initial migration bundle) + admin bootstrap script.
3. **`_shared/deployment.ts`** switching backends by env (already listed in §06 P1-14).
4. **Storage adapter** (Supabase / S3 / MinIO / Azure / local FS) — §06 P2-7.
5. **Auth adapter** — Supabase (SaaS), local auth service + SAML/OIDC bridge (on-prem). Local mode uses same Postgres for users.
6. **Mail adapter** — Resend / SMTP relay / disabled.
7. **AI backend adapter** — Lovable AI Gateway / disabled / self-hosted (ollama-shaped OpenAI-compatible endpoint).
8. **License-file verification** (see §11).
9. **`omp-update` CLI** for signed package installs + rollback.
10. **`omp-backup` CLI** wrapping `pg_basebackup`, WAL archive, storage snapshot, all GPG-encrypted.
11. **Installer wizard** (Windows: WiX installer or PowerShell DSC; Linux: shell installer / .rpm / .deb) that:
    - checks prerequisites (Docker, disk space, ports),
    - prompts for install path, data path, backup path, storage backend,
    - prompts for TLS certs or generates self-signed,
    - prompts for initial admin credentials,
    - mounts the license file,
    - runs migrations,
    - installs `omp-update` as a service.
12. **Silent install** manifest (JSON / INI) for enterprise MDM.

## Signed update packages (`.omp`)

Tarball with:

```
manifest.json          # version, min-from, migrations[], changelog, sig
images/                # docker images (offline load)
migrations/            # sql migration files
notes/CHANGELOG.md
signature              # Ed25519 signature over manifest.json + files hash
```

`omp-update apply pkg-v1.2.3.omp` performs:

1. Verify Ed25519 signature against baked public key.
2. Verify `min-from` compatibility with current installed version.
3. Snapshot DB + storage (via `omp-backup`) — for rollback.
4. Load images (`docker load`) into local Docker.
5. Run migrations transactionally.
6. Restart services.
7. Health-check gated cutover.

`omp-update rollback` restores the previous snapshot and swaps images.

## Air-gapped considerations

- **Zero outbound calls required.** Verify by network policy that the running system never dials out unless explicitly configured (email relay, LDAP, customer S3).
- **License verification** is cryptographic and offline. No online-check fallback.
- **Update packages** are sneakernet-delivered (USB / DMZ file drop). `omp-update` verifies signatures locally.
- **HIBP password check** must be operable offline: bundle the HIBP hash range for the top N passwords or disable and rely on password policy + blocklist.
- **AI features** disabled or pointed at a customer-hosted model endpoint.
- **Time source** must be reliable; document NTP requirement.

## Data ownership guarantees

- Uninstalling the app **never** deletes the data or backup directories.
- Uninstalling only removes the containers, systemd/service units, and CLI symlinks.
- Documentation states this explicitly.
- License expiry → read-only, never destructive.
- Backups are GPG-encrypted with a customer-owned key; OpsManagerPro cannot decrypt them.

## Support model for on-prem

- **Named support engineer** per customer.
- **Tunneled support session** (customer-initiated, e.g., Teleport / Tailscale / customer VPN). No default remote access.
- **Support bundle** command: `omp-support-bundle` emits a scrubbed diagnostic archive (logs redacted through the same `sanitizeForLogging` path).
- **Response SLAs** per plan tier (P1: 1 h, P2: 4 h, P3: 1 business day).

## Roadmap position

- **P3** overall — do not build until a named customer + underwritten funding.
- **P1** foundations that make it possible (env-driven config, storage adapter interface, license-file verification path, SBOM & signed builds) can and should ship inside the commercial roadmap; they are cheap insurance and improve SaaS security posture on their own.

## Non-goals

- No hardware appliance.
- No dongle / hardware license.
- No auto-phone-home.
- No forced telemetry.
- No feature parity gap between SaaS and on-prem; only integration differences (e.g., AI features may be disabled).
