#!/usr/bin/env bash
# Minimal steps after git pull when you skip full update-qadbak.sh.
set -euo pipefail

ROOT="${QADBAK_DIR:-/opt/qadbak}"
USER="${QADBAK_USER:-qadbak}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/vps-after-pull.sh" >&2
  exit 1
fi

cd "$ROOT"
command -v jq &>/dev/null || apt-get install -y -qq jq

if [[ -f "$ROOT/scripts/git-sync-origin.sh" ]]; then
  bash "$ROOT/scripts/reset-git-drift-before-pull.sh"
  bash "$ROOT/scripts/git-sync-origin.sh"
fi
bash "$ROOT/scripts/fix-qadbak-ownership.sh"
sudo -u "$USER" bash -c "cd '$ROOT' && npm install && npm run build"
bash "$ROOT/scripts/repair-terminal-ws.sh" 2>/dev/null || bash "$ROOT/scripts/ensure-terminal-deps.sh"
bash "$ROOT/scripts/configure-panel-vhost-sudo.sh" 2>/dev/null || true
bash "$ROOT/scripts/configure-updates-sudo.sh" 2>/dev/null || true
bash "$ROOT/scripts/configure-php-fpm-sudo.sh" 2>/dev/null || true
bash "$ROOT/scripts/configure-panel-pm2-sudo.sh" 2>/dev/null || true
bash "$ROOT/scripts/apply-all-php-fpm-pools.sh" 2>/dev/null || true
bash "$ROOT/scripts/ensure-fail2ban.sh" 2>/dev/null || true
bash "$ROOT/scripts/pm2-restart-qadbak.sh"

# Auto-refresh Premium artifact if a license is already active. Catches
# the common case where a customer pulls a panel update that fixes a
# license-side bug (JWT verify, Ed25519 sig, etc.) and would otherwise
# need to remember to click Refresh modules manually.
if [[ -f "$ROOT/data/license.json" ]]; then
  echo "==> License heartbeat + Premium artifact sync (auto)"
  if sudo -u "$USER" bash -c "cd '$ROOT' && node scripts/qadbak-license-cli.mjs sync"; then
    echo "    Premium modules refreshed."
  else
    echo "    WARN: Premium sync failed — open Server admin → License → Refresh modules for a diagnostic message." >&2
  fi
fi

echo "Done — panel, terminal WS, PHP-FPM pools and Premium modules refreshed."
