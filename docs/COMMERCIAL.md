# Qadbak commercial tiers and VPS migration

Copyright (c) 2026 MacDirtyCow / Qadbak and Omiiba. See [LICENSE](../LICENSE).

## Tiers

| Tier | Source | Use |
|------|--------|-----|
| **Core (public GitHub)** | `macdirtycow/qadbak` | Transparency, auditing, personal evaluation on **your own** VPS |
| **Premium (customers)** | Download from **license server** after key activation | No GitHub token; see [PREMIUM-DISTRIBUTION.md](./PREMIUM-DISTRIBUTION.md) |
| **Premium (operator source)** | Private `macdirtycow/qadbak-premium` — **you only**, build & upload artifacts | Never given to customers |
| **Licensed runtime** | Core + signed Premium bundle on disk | Production commercial installs |

Public `git clone` gives **Core only**. Premium API routes return `503 PREMIUM_REQUIRED` until a license is activated and **Refresh modules** has downloaded the bundle.

## Operator stack (you — siccamanagement / main server)

**Customers** only clone public qadbak. **You** (operator) additionally:

1. Clone **public** qadbak to `/opt/qadbak` on panel VPS(es).
2. Build Premium on **your** CI or ops machine from private `qadbak-premium` → upload to license server (not customer-facing git).
3. Run license server at **`https://license.omiiba.dev`** — see [LICENSE-SERVER.md](./LICENSE-SERVER.md).
4. Set in `/opt/qadbak/.env.local`:

```env
QADBAK_LICENSE_SERVER=https://license.omiiba.dev
QADBAK_LICENSE_JWT_SECRET=<same as license server LICENSE_JWT_SECRET>
```

5. **Server admin → License** → activate key → **Refresh modules**.
6. Daily heartbeat: install `scripts/license-heartbeat.sh` via cron or systemd timer.

```bash
# Example cron (as qadbak user)
0 4 * * * /opt/qadbak/scripts/license-heartbeat.sh >> /opt/qadbak/data/license-heartbeat.log 2>&1
```

After each Core update:

```bash
cd /opt/qadbak && sudo bash scripts/update-qadbak.sh
node scripts/qadbak-license-cli.mjs sync
```

`update-qadbak.sh` runs `scripts/git-sync-origin.sh`, which fetches origin, migrates legacy `cursor/*` branches to `macdirtycow/*`, and resets when history was rewritten. Set the tracked branch in `/opt/qadbak/.env.local`:

```env
QADBAK_GIT_BRANCH=macdirtycow/proprietary-premium-commercialization
```

**One-time bootstrap** after a force-pushed history (if `update-qadbak.sh` is not on the server yet):

```bash
cd /opt/qadbak
git fetch --prune origin
git checkout -B main origin/main
# or: git checkout -B macdirtycow/proprietary-premium-commercialization origin/macdirtycow/proprietary-premium-commercialization
sudo bash scripts/update-qadbak.sh
```

When you change private Premium source: rebuild, upload artifact to the license server, then **Refresh modules** on each licensed panel (customers do this themselves after you publish a new artifact version).

## What eval users may not do

- Host paying customers without a commercial license
- Redistribute Premium bundles or remove license checks
- Fork and operate a competing hosted panel

See [COMMERCIAL-LICENSING.md](../COMMERCIAL-LICENSING.md).

## Legal

This document is operational guidance, not legal advice. Consult an attorney for NL/EU commercial sales, VAT, and customer agreements.
