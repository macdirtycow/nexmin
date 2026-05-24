# Ubuntu 24.04 LTS support

Qadbak native stack is tested on **Ubuntu 22.04 (Jammy)** and **Ubuntu 24.04 (Noble)**.

| Area | 22.04 | 24.04 |
|------|-------|-------|
| nginx / Apache / MariaDB | ✓ | ✓ |
| Postfix + Dovecot + Sieve | ✓ | ✓ |
| BIND DNS | `bind9utils` | `bind9-utils` (auto) |
| PHP-FPM | 8.1 default meta | **8.3** default meta |
| Node 20 (panel) | ✓ | ✓ |

Install scripts detect the release via `/etc/os-release` (`scripts/lib/ubuntu-release.sh`).

## Verify a VPS before install

```bash
sudo bash /opt/qadbak/scripts/check-ubuntu-support.sh
```

## Fresh install on Ubuntu 24.04

Same as 22.04:

```bash
apt-get update && apt-get install -y git
git clone https://github.com/macdirtycow/qadbak.git /opt/qadbak
cd /opt/qadbak
sudo bash install/qadbak-install.sh
```

## Upgrade path (22.04 → 24.04)

Not automated in-panel. Recommended for production:

1. New **24.04** VPS (or in-place `do-release-upgrade` with backups).
2. Install Qadbak with `install/qadbak-install.sh`.
3. Restore `data/`, `.env.local`, domains (`native-domains.json`), and mail data.
4. Re-run `configure-native-mail.sh --force`, mail-sync, PHP-FPM pools.
5. Activate license + **Refresh modules** on the new host.

## Moving from test VPS (siccamanagement) to main server

Suggested order:

| Step | Test VPS (22.04) | Main server (24.04) |
|------|------------------|---------------------|
| 1 | Validate Premium + license flow | — |
| 2 | — | `check-ubuntu-support.sh` on 24.04 |
| 3 | — | Fresh install Qadbak + license server at `license.omiiba.dev` |
| 4 | Export domain/mail backups | Import + DNS cutover |
| 5 | Keep as staging or decommission | Production panel |

**Customers** only need: public `qadbak` clone + license key — never `qadbak-premium` git access.

See [PREMIUM-DISTRIBUTION.md](./PREMIUM-DISTRIBUTION.md) and [LICENSE-SERVER.md](./LICENSE-SERVER.md).

## What we do not support yet

- Ubuntu 20.04 or older (EOL)
- Non-LTS interim releases (23.10, 24.10) — may work but untested
- Debian / RHEL native stack (future)
