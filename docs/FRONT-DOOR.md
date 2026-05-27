# Qadbak panel vs customer websites

## What users should see

| Visitor opens | Should land on |
|---------------|----------------|
| `https://panel-domain` (e.g. qadbak.com, server FQDN) | Qadbak (marketing + `/login`) |
| `http://SERVER_IP:11000` (if enabled) | Qadbak panel |
| `http://customer-domain/` | **Their** site in `public_html` (Apache / legacy hosting API) |
| `https://server-hostname:10000` | Classic server admin/legacy hosting API (admin only) |

Qadbak is the **panel UI** on the panel hostname (and optional extra port). **Customer domains** are served by Apache behind nginx — not the Qadbak landing page.

## Nginx layout

- **Named hosts** (`__PANEL_HOST__`, `__SERVER_FQDN__`) on 80/443 → proxy to `127.0.0.1:3000` (Qadbak).
- **`default_server` on port 80** → proxy to Apache at `__APACHE_BACKEND__` (detected by `scripts/detect-apache-backend.sh`, usually `127.0.0.1:8080`).
- legacy hosting API/server admin API stays on **port 10000**.

Details: `docs/HOSTING-NGINX.md`.

## Install

```bash
sudo bash install/qadbak-install.sh
```

When prompted, use the hostname users type for the **panel** (not each customer domain).

## Existing server — switch hosting mode

```bash
cd /opt/qadbak && git pull
sudo bash scripts/apply-hosting-nginx.sh
```

Set in `.env.local`:

```env
QADBAK_PUBLIC_HOST=qadbak.com
QADBAK_LEGACY_PANEL_URL=https://your-server-fqdn:10000
QADBAK_ORIGIN_IP=YOUR_VPS_PUBLIC_IP
```

`QADBAK_LEGACY_PANEL_URL` is for login links and embeds, not customer websites.

## Optional: hide server admin from the internet

```bash
sudo sed -i 's/^listen=.*/listen=127.0.0.1/' /etc/legacy-host/miniserv.conf
sudo systemctl restart legacy-panel
```

Then only Qadbak can talk to server admin on the server.
