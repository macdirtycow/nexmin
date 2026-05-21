# Qadbak as front door (not VirtualMin on :10000)

## What users should see

| Visitor opens | Should land on |
|---------------|----------------|
| `http://SERVER_IP` | Qadbak (marketing + `/login`) |
| `http://server-hostname` | Qadbak (redirect to HTTPS when cert exists) |
| `https://panel-domain` (e.g. qadbak.com) | Qadbak |
| `https://server-hostname:10000` | Classic Webmin/VirtualMin (admin only) |

Qadbak is the **product UI** on normal web ports. VirtualMin remains the engine on **port 10000** — used by Qadbak over `remote.cgi` and for “open in Webmin” embeds, not as the first page clients see.

## Before (wrong for your goal)

- Port **10000** = default VirtualMin UI (what people hit if they use `https://ip:10000`).
- Port **443** only configured for a **separate** domain (e.g. qadbak.com), or not at all.
- Port **80** = Apache/default site or nothing → not Qadbak.

## After (correct)

- **nginx `default_server` on port 80** → proxies to Qadbak (`127.0.0.1:3000`).
- **nginx on 443** for panel hostname + server FQDN → Qadbak.
- **Port 10000** → still Webmin; do not give that URL to end users.

## Install

Use the panel hostname that users will type (often the **same** as the server FQDN, e.g. `mareades.com`, or a brand domain `qadbak.com` pointing to the same IP):

```bash
sudo bash install/qadbak-install.sh
```

When prompted for panel hostname, you can enter the server’s own hostname so `https://your-server` opens Qadbak.

## Manual nginx

```bash
FQDN=$(hostname -f)
PANEL=qadbak.com   # or $FQDN
sed -e "s/__PANEL_HOST__/$PANEL/g" -e "s/__SERVER_FQDN__/$FQDN/g" \
  deploy/nginx-qadbak.conf | sudo tee /etc/nginx/sites-available/qadbak
sudo ln -sf /etc/nginx/sites-available/qadbak /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d "$PANEL" -d "$FQDN"
```

Set in `.env.local`:

```env
QADBAK_PUBLIC_HOST=qadbak.com
WEBMIN_UI_URL=https://your-server-fqdn:10000
```

`WEBMIN_UI_URL` is for login links and embeds, not the public homepage.

## Optional: hide Webmin from the internet

To stop users bypassing Qadbak via `:10000`, bind Webmin to localhost only (breaks direct browser access to Webmin; Qadbak API still works):

```bash
# Example — verify paths on your system first
sudo sed -i 's/^listen=.*/listen=127.0.0.1/' /etc/webmin/miniserv.conf
sudo systemctl restart webmin
```

Then only Qadbak can talk to Webmin on the server. Embedded modules still need reachable Webmin URLs — use a reverse proxy path in a later phase if you lock down :10000.
