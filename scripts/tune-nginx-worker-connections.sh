#!/usr/bin/env bash
# Raise nginx worker_connections (panel behind proxy can open many upstream sockets).
set -euo pipefail
CONF="/etc/nginx/nginx.conf"
[[ -f "$CONF" ]] || { echo "No $CONF" >&2; exit 1; }
TARGET="${1:-4096}"
if grep -qE '^\s*worker_connections\s+' "$CONF"; then
  sed -i -E "s/^\s*worker_connections\s+.*/    worker_connections ${TARGET};/" "$CONF"
else
  sed -i -E "/events\s*\{/a\\    worker_connections ${TARGET};" "$CONF"
fi
nginx -t
systemctl reload nginx
echo "OK — worker_connections=${TARGET}"
