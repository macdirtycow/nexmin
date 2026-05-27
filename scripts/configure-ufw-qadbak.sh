#!/usr/bin/env bash
# Basic firewall for a Qadbak test VPS (SSH + web; server admin optional).
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

if ! command -v ufw &>/dev/null; then
  apt-get install -y -qq ufw
fi

if [[ -z "${OPEN_LEGACY_PANEL:-}" ]]; then
  read -rp "Allow server admin port 10000 from anywhere? (y/N): " OPEN_LEGACY_PANEL
fi
OPEN_LEGACY_PANEL="${OPEN_LEGACY_PANEL:-N}"

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
# Optional alt panel port (enable-panel-port.sh); set PANEL_ALT_PORT=11000 to open here
if [[ -n "${PANEL_ALT_PORT:-}" ]]; then
  ufw allow "${PANEL_ALT_PORT}/tcp"
  echo "Panel alt port ${PANEL_ALT_PORT}/tcp allowed."
fi
if [[ "$OPEN_LEGACY_PANEL" =~ ^[Yy]$ ]]; then
  ufw allow 10000/tcp
  echo "server admin :10000 opened (prefer locking to your IP in production)."
else
  echo "server admin :10000 not opened — use SSH tunnel or Qadbak embeds only."
fi

ufw --force enable
ufw status
