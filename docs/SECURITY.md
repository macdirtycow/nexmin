# Panel security

No hosting panel is “unhackable.” Qadbak layers **defense in depth** so common attacks (credential stuffing, CSRF, session theft, IDOR, recon via `/api/health`) are blocked or slowed.

## Built into the app

| Control | What it does |
|--------|----------------|
| Security headers | CSP, HSTS (HTTPS), `X-Frame-Options: DENY`, `nosniff`, COOP/CORP |
| CSRF / Origin | Mutating `/api/*` calls require same-origin `Origin` or `Referer` |
| Session JWT | `httpOnly` cookie, `iss`/`aud`, configurable max age, `SameSite=strict` (default) |
| Login limits | Per-IP + per-username rate limits, random delay on failed password |
| API limits | Per-user + per-IP caps on authenticated API traffic |
| Client RBAC | Premium clients blocked from `/admin`, domain create, enable/disable |
| Domain access | Native ops + API require domain allowlist for clients |
| TOTP | Optional; force admins with `QADBAK_REQUIRE_ADMIN_TOTP=true` |
| Health | `QADBAK_HEALTH_MINIMAL=true` hides stack details (keeps `ok` + `mock` for monitors) |

## On the VPS (operator checklist)

```bash
sudo bash /opt/qadbak/scripts/check-panel-security.sh
sudo bash /opt/qadbak/scripts/harden-panel-security.sh
```

1. **Secrets** — `SESSION_SECRET` ≥ 32 random bytes (`openssl rand -base64 48`).
2. **Passwords** — change `admin` / remove `changeme`; `chmod 600 data/users.json`.
3. **HTTPS only** — panel on nginx :443; app on `127.0.0.1:3000` only.
4. **TOTP** — all admin accounts; then `QADBAK_REQUIRE_ADMIN_TOTP=true`.
5. **Firewall** — UFW: 22, 80, 443 only; fail2ban on ssh + nginx.
6. **Updates** — `git-sync` + `update-qadbak.sh` monthly.
7. **Backups** — `.env.local`, `data/`, offsite encrypted.

## Environment (`.env.local`)

```env
QADBAK_TRUST_PROXY=true
QADBAK_HEALTH_MINIMAL=true
QADBAK_COOKIE_SAMESITE=strict
QADBAK_SESSION_MAX_AGE_HOURS=24
QADBAK_REQUIRE_ADMIN_TOTP=true
QADBAK_LOGIN_RATE_LIMIT=8
QADBAK_API_RATE_LIMIT_PER_USER=300
```

## Remaining risks

- **Server compromise** (root, outdated kernel, weak SSH) bypasses the panel.
- **Customer PHP** on the same host is a separate attack surface (WAF, isolation).
- **Supply chain** — pin dependencies, review `git pull` before update.

Report issues responsibly via your vendor contact or GitHub Security Advisories.
