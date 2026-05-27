# E2E testing

Two modes — **not separate products**, one flows into the other.

## 1. Install / production panel (real)

**Runs automatically** at the end of `install/qadbak-install.sh` via `post-install-verify.sh`:

1. Preflight (`pm2`, `.env.local`, `test-api`)
2. `/api/health` with `"mock": false`
3. **Playwright** `e2e/install-verify.spec.ts` against `http://127.0.0.1:3000` with the admin password you chose at install

Re-run on the server:

```bash
sudo bash /opt/qadbak/scripts/post-install-verify.sh
# or
npm run test:e2e:install   # as root, with .install-test.env present
```

Uses `.install-test.env` (written by installer, gitignored).

**Note:** Linux user `qadbak` has no login/sudo password (service account). `run-install-e2e.sh` installs Playwright system libraries as **root**; only the browser cache runs as `qadbak`. If you see `[sudo] password for qadbak`, pull the latest script and re-run verify as root.

## 2. Local / CI (mock)

Fast regression without legacy hosting API:

```bash
npm run test:e2e
```

Starts a temporary app on port **3099** with `QADBAK_LEGACY_API_MOCK=true` and runs `e2e/smoke.spec.ts`.

## Optional manual VPS from your laptop

```bash
E2E_BASE_URL=https://panel-test.example.com \
E2E_ADMIN_USER=admin \
E2E_ADMIN_PASS='your-password' \
E2E_INSTALL_VERIFY=1 \
npx playwright test e2e/install-verify.spec.ts
```

## After automated E2E

Use [E2E-CHECKLIST.md](./E2E-CHECKLIST.md) for legacy hosting API-specific actions (create domain, mailbox, DNS record) — those need data on the server.
