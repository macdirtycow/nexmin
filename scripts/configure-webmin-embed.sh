#!/usr/bin/env bash
# Allow Webmin UI in panel iframes and prepare for /embed/webmin/ nginx proxy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEBMIN_CONFIG="/etc/webmin/config"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/configure-webmin-embed.sh" >&2
  exit 1
fi

if [[ ! -f "$WEBMIN_CONFIG" ]]; then
  echo "Webmin not installed ($WEBMIN_CONFIG missing) — skip." >&2
  exit 0
fi

echo "==> Webmin: allow in-panel iframes (no_frame_options=1)"
if grep -q '^no_frame_options=' "$WEBMIN_CONFIG" 2>/dev/null; then
  sed -i 's/^no_frame_options=.*/no_frame_options=1/' "$WEBMIN_CONFIG"
else
  echo 'no_frame_options=1' >>"$WEBMIN_CONFIG"
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

echo "==> Webmin embed config applied"
