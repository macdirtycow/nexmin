# Automated E2E (Playwright)

Stable **mock-mode** tests — no VirtualMin VPS required for CI/local.

## Run (default)

```bash
npm run test:e2e
```

This will:

1. Copy `data/users.example.json` → `data/users.json` (admin/klant, password `changeme`)
2. Build Next.js if needed
3. Start the app on port **3099** with `VIRTUALMIN_MOCK=true`
4. Run Chromium tests: health, home, about, admin login + domains, client RBAC

## What is covered

| Test | Proves |
|------|--------|
| `/api/health` | App boots, mock flag |
| `/` | Marketing page |
| `/about` | Name story page |
| Admin login | Session cookie, dashboard |
| Mock domains | `voorbeeld.nl`, `demo.test` on dashboard |
| `/domains` | Domains list route |
| `/admin` | Admin-only area |
| Client `klant` | Only `voorbeeld.nl`, `/admin` → redirect |

This is **not** a substitute for live VPS checks in [E2E-CHECKLIST.md](./E2E-CHECKLIST.md) — run those once on a test server with `VIRTUALMIN_MOCK=false`.

## Live VPS (optional)

```bash
E2E_LIVE_URL=https://panel-test.example.com \
E2E_LIVE_USER=admin \
E2E_LIVE_PASS='your-password' \
npm run test:e2e:live
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port 3099 in use | `E2E_PORT=3100 npm run test:e2e` |
| Browser missing | `npx playwright install chromium` |
| Build slow first run | Normal; later runs reuse `.next` |
