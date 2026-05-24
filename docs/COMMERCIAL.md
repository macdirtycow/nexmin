# Qadbak commercial tiers

Copyright (c) 2026 MacDirtyCow / Qadbak and Omiiba. See [LICENSE](../LICENSE).

## Tiers

| Tier | What you install |
|------|------------------|
| **Core** | Public [`macdirtycow/qadbak`](https://github.com/macdirtycow/qadbak) — evaluation on your own VPS |
| **Premium** | Activated in **Server admin → License**; modules download from the license server |

Public `git clone` gives Core only. Premium features need a valid license and **Refresh modules** in the panel.

## Licensed panel configuration

In `/opt/qadbak/.env.local`:

```env
QADBAK_LICENSE_SERVER=https://license.omiiba.dev
QADBAK_LICENSE_JWT_SECRET=<from your license provider>
QADBAK_GIT_BRANCH=main
```

Then **Activate** your key and **Refresh modules**.

Daily heartbeat (optional):

```bash
0 4 * * * /opt/qadbak/scripts/license-heartbeat.sh >> /opt/qadbak/data/license-heartbeat.log 2>&1
```

## Updates

```bash
cd /opt/qadbak && sudo bash scripts/update-qadbak.sh
node scripts/qadbak-license-cli.mjs sync
```

`update-qadbak.sh` runs `scripts/git-sync-origin.sh`, which fetches origin and aligns the checkout with `QADBAK_GIT_BRANCH` (default **`main`** for production).

**One-time bootstrap** if an older install still tracks the internal branch:

```bash
sudo bash /opt/qadbak/scripts/switch-vps-to-main.sh
sudo bash /opt/qadbak/scripts/update-qadbak.sh
```

Premium **source** and license-server **operator** tooling live in the private repo [`macdirtycow/qadbak-premium`](https://github.com/macdirtycow/qadbak-premium) — not in public qadbak.

## What eval users may not do

- Host paying customers without a commercial license
- Redistribute Premium bundles or remove license checks

See [COMMERCIAL-LICENSING.md](../COMMERCIAL-LICENSING.md).
