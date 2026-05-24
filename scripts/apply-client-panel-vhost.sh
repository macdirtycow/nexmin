#!/usr/bin/env bash
# Nginx vhost: panel.<domain> → Qadbak Next.js (:3000) and terminal WS (:3001).
# Usage: sudo bash scripts/apply-client-panel-vhost.sh example.com
#        sudo bash scripts/apply-client-panel-vhost.sh __probe__
set -euo pipefail

ROOT="${QADBAK_DIR:-/opt/qadbak}"
DOMAIN="${1:-}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

if [[ "$DOMAIN" == "__probe__" ]]; then
  echo "OK"
  exit 0
fi

if [[ -z "$DOMAIN" ]] || [[ "$DOMAIN" == *"/"* ]] || [[ "$DOMAIN" == *" "* ]]; then
  echo "Usage: sudo bash scripts/apply-client-panel-vhost.sh <domain>" >&2
  exit 1
fi

DOMAIN="$(echo "$DOMAIN" | tr '[:upper:]' '[:lower:]')"
PANEL_HOST="panel.${DOMAIN}"
SAFE="${DOMAIN//./-}"
OUT="/etc/nginx/sites-available/qadbak-panel-${SAFE}.conf"
ENABLED="/etc/nginx/sites-enabled/qadbak-panel-${SAFE}.conf"

cat >"$OUT" <<EOF
# Qadbak client panel — ${PANEL_HOST}
server {
    listen 80;
    listen [::]:80;
    server_name ${PANEL_HOST};

    client_max_body_size 64m;

    location /ws/domain-terminal {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF

ln -sf "$OUT" "$ENABLED"
nginx -t
systemctl reload nginx
echo "OK — http://${PANEL_HOST}/ → Qadbak panel"
