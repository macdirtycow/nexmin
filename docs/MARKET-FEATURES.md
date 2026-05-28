# Market competition features (phases 1–8)

Shipped on `main` for native VPS installs. Each phase has a checklist in `docs/MARKET-PHASE-N.md`.

| Phase | Summary | Doc |
|-------|---------|-----|
| **1** | Native production hardening, E2E matrix | [MARKET-PHASE-1.md](./MARKET-PHASE-1.md) |
| **2** | One-click app catalog (Scripts / Apps) | [MARKET-PHASE-2.md](./MARKET-PHASE-2.md) |
| **3** | Node, Python, Docker runtimes per domain | [MARKET-PHASE-3.md](./MARKET-PHASE-3.md) |
| **4** | Encrypted offsite backups (S3 / B2 / GCS) | [MARKET-PHASE-4.md](./MARKET-PHASE-4.md) |
| **5** | Granular backup restore (files + single DB) | [MARKET-PHASE-5.md](./MARKET-PHASE-5.md) |
| **6** | Metrics history, alert rules (email / Slack / Telegram) | [MARKET-PHASE-6.md](./MARKET-PHASE-6.md) |
| **7** | UFW firewall admin, ModSecurity WAF, ClamAV scans | [MARKET-PHASE-7.md](./MARKET-PHASE-7.md) |
| **8** | REST API v1, API keys, WHMCS + Blesta starters | [MARKET-PHASE-8.md](./MARKET-PHASE-8.md) |

## Operator highlights

- **Panel URLs:** `https://panel.<customer-domain>/login` (per-domain vhost) plus main host and optional `:11000` — see [CLOUDFLARE.md](./CLOUDFLARE.md) for SSL modes.
- **After `update-qadbak.sh`:** `sudo bash scripts/fix-panel-now.sh` (also runs automatically at end of update).
- **API:** OpenAPI at [api/openapi.yaml](./api/openapi.yaml) · WHMCS guide [integrations/WHMCS-INTEGRATION.md](./integrations/WHMCS-INTEGRATION.md).

## Quick verify on a VPS

```bash
cd /opt/qadbak
sudo bash scripts/run-market-phase1-check.sh   # native mode gate
curl -sS http://127.0.0.1:3000/api/health | jq .
sudo bash scripts/diagnose-panel-access.sh panel.example.com
```
