#!/usr/bin/env bash
# Allow Webmin in panel iframes + subdirectory proxy (/embed/webmin/) for auto-login links.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEBMIN_CONFIG="/etc/webmin/config"
MINISERV_CONF="/etc/webmin/miniserv.conf"
ENV_FILE="${QADBAK_DIR:-$ROOT}/.env.local"
EMBED_PREFIX="/embed/webmin"

set_config_key() {
  local file="$1" key="$2" val="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$file"
  else
    echo "${key}=${val}" >>"$file"
  fi
}

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/configure-webmin-embed.sh" >&2
  exit 1
fi

if [[ ! -f "$WEBMIN_CONFIG" ]]; then
  echo "Webmin not installed ($WEBMIN_CONFIG missing) — skip." >&2
  exit 0
fi

PANEL_URL=""
if [[ -f "$ENV_FILE" ]]; then
  PANEL_URL="$(grep -E '^QADBAK_PANEL_URL=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
fi

REDIRECT_HOST=""
REDIRECT_SSL=0
REFERERS=""
if [[ -n "$PANEL_URL" ]]; then
  read -r REDIRECT_HOST REDIRECT_SSL REFERERS < <(
    python3 -c "
from urllib.parse import urlparse
import sys
u = urlparse(sys.argv[1])
host = u.hostname or ''
port = u.port
ssl = 1 if u.scheme == 'https' else 0
ref = f'{host}:{port}' if port else host
print(host, ssl, ref)
" "$PANEL_URL" 2>/dev/null || echo ""
  )
fi
if [[ -z "$REDIRECT_HOST" ]]; then
  REDIRECT_HOST="$(hostname -f 2>/dev/null || hostname)"
  REFERERS="$REDIRECT_HOST"
fi

echo "==> Webmin: iframe + proxy prefix $EMBED_PREFIX (host: $REFERERS)"
set_config_key "$WEBMIN_CONFIG" "no_frame_options" "1"
set_config_key "$WEBMIN_CONFIG" "webprefix" "$EMBED_PREFIX"
set_config_key "$WEBMIN_CONFIG" "webprefixnoredir" "1"
set_config_key "$WEBMIN_CONFIG" "referers" "$REFERERS"

if [[ -f "$MINISERV_CONF" ]]; then
  set_config_key "$MINISERV_CONF" "redirect_prefix" "$EMBED_PREFIX"
  set_config_key "$MINISERV_CONF" "cookiepath" "$EMBED_PREFIX"
  set_config_key "$MINISERV_CONF" "redirect_host" "$REDIRECT_HOST"
  set_config_key "$MINISERV_CONF" "redirect_ssl" "$REDIRECT_SSL"
  # Trust X-Forwarded-* from local nginx only
  if ! grep -q '^trust_real_ip=' "$MINISERV_CONF" 2>/dev/null; then
    echo 'trust_real_ip=127.0.0.1' >>"$MINISERV_CONF"
  fi
fi

if systemctl is-active webmin &>/dev/null; then
  systemctl restart webmin
  echo "    webmin restarted"
else
  echo "    WARN: webmin not running — start with: systemctl start webmin" >&2
fi

if [[ -f "$ROOT/scripts/sync-webmin-embed-env.sh" ]]; then
  bash "$ROOT/scripts/sync-webmin-embed-env.sh" || true
fi

echo "==> Webmin embed config applied (login links should auto-login, no Webmin password in panel)"
