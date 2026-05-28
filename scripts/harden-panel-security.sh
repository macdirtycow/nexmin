#!/usr/bin/env bash
# Apply recommended panel security settings on the VPS (run as root after git pull).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${QADBAK_ENV_FILE:-$ROOT/.env.local}"
QADBAK_USER="${QADBAK_USER:-qadbak}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/harden-panel-security.sh" >&2
  exit 1
fi

echo "==> Qadbak panel hardening"

bash "$ROOT/scripts/check-panel-security.sh" || true

if [[ -f "$ENV_FILE" ]]; then
  grep -q '^QADBAK_TRUST_PROXY=' "$ENV_FILE" || echo 'QADBAK_TRUST_PROXY=true' >>"$ENV_FILE"
  grep -q '^QADBAK_HEALTH_MINIMAL=' "$ENV_FILE" || echo 'QADBAK_HEALTH_MINIMAL=true' >>"$ENV_FILE"
  grep -q '^QADBAK_COOKIE_SAMESITE=' "$ENV_FILE" || echo 'QADBAK_COOKIE_SAMESITE=strict' >>"$ENV_FILE"
  if grep -q '^SESSION_SECRET=change-me' "$ENV_FILE" 2>/dev/null; then
    echo "    Generating SESSION_SECRET..."
    SEC="$(openssl rand -base64 48 | tr -d '\n')"
    sed -i.bak "s|^SESSION_SECRET=.*|SESSION_SECRET=$SEC|" "$ENV_FILE"
    echo "    All users must sign in again after pm2 restart."
  fi
fi

chmod 600 "$ROOT/data/users.json" 2>/dev/null || true
chmod 600 "$ENV_FILE" 2>/dev/null || true

SNIP="$ROOT/deploy/nginx-panel-security.conf"
if [[ -f "$SNIP" ]] && [[ -d /etc/nginx/snippets ]]; then
  cp "$SNIP" /etc/nginx/snippets/qadbak-security.conf
  if ! grep -rq 'qadbak-security.conf' /etc/nginx/sites-enabled/ 2>/dev/null; then
    echo "    Add to your panel server block: include snippets/qadbak-security.conf;"
  fi
  nginx -t && systemctl reload nginx
fi

sudo -u "$QADBAK_USER" bash -c "cd '$ROOT' && bash scripts/pm2-restart-qadbak.sh" || true

echo "==> Done. Enable admin TOTP: set QADBAK_REQUIRE_ADMIN_TOTP=true after all admins enrolled."
