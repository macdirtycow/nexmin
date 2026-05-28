# WHMCS integration (Qadbak API v1)

## Overview

The module in `integrations/whmcs/qadbak.php` provisions accounts via **API v1** with full lifecycle support:

| WHMCS function | API |
|----------------|-----|
| CreateAccount | `POST /api/v1/domains` (plan + limits) |
| TerminateAccount | `DELETE /api/v1/domains/{domain}` |
| SuspendAccount | `POST /api/v1/domains/{domain}/suspend` `{ "enabled": false }` |
| UnsuspendAccount | same with `{ "enabled": true }` |
| ChangePackage | `PATCH /api/v1/domains/{domain}/limits` (plan + disk/mail/db/bandwidth) |
| ChangePassword | `POST /api/v1/domains/{domain}/mail` |

Mail, DNS, SSL, and remote S3 backups are available on the same API for custom hooks or support tools.

## Server setup

1. **Panel URL** — Set WHMCS server hostname to your Qadbak panel origin (e.g. `https://panel.example.com`), no trailing slash.
2. **API key** — Admin → API keys → create key with scopes: `domains`, `mail`, `dns`, `ssl`, `backups`, `limits`, `plans` (read/write as needed). Paste the secret into module config option **API Token**.
3. **Plans** — Define plans in Qadbak Admin → Plans (or `POST /api/v1/plans`). Set **Default plan** in the module to match the WHMCS product tier.
4. **Config options** — Map product tiers using module options 2–6 (plan name, disk, mailboxes, databases, bandwidth). `ChangePackage` pushes these to Qadbak on upgrade/downgrade.

## Product mapping example

| WHMCS product | Default plan | Disk | Mailboxes | DBs |
|---------------|--------------|------|-----------|-----|
| Starter | Starter | 5GB | 10 | 2 |
| Business | Business | 25GB | 50 | 10 |

Use separate WHMCS server entries per panel node if you run multiple Qadbak hosts.

## Remote backups (S3)

WHMCS does not call backup APIs by default. Operators can use:

- `GET /api/v1/domains/{domain}/backups` — local + remote keys
- `POST` with `{ "action": "pull-remote", "remoteKey": "..." }` — download to host
- `POST` with `{ "action": "pull-remote-restore", "remoteKey": "...", "testRestore": false }` — import and restore

Requires premium feature `offsite-backup` and configured cloud credentials in the panel.

## Security (panel UI)

Malware (scheduled ClamAV + quarantine) and ModSecurity CRS audit logs are managed in the domain **Security** tab, not via WHMCS unless you add custom API calls.

## Blesta

See `integrations/blesta/qadbak_module.php` for the same suspend/package sync via package meta fields (`api_token`, `host`, `plan`, `disk`, etc.).
