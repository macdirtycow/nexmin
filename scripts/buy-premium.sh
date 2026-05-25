#!/usr/bin/env bash
# One-shot upgrade-and-activate for customers who buy Premium on an
# existing Qadbak install. Replaces a multi-step recovery (git pull +
# build + restart + activate + sync + reload) with one command they
# can paste from their license-purchase email.
#
# Usage:
#   sudo bash /opt/qadbak/scripts/buy-premium.sh QAD-XXXX-YYYY-ZZZZ
#
# What it does, in order:
#   1. Pulls latest Qadbak (so panel has the JWT/Ed25519/auto-reload fixes)
#   2. Rebuilds + restarts pm2 as the qadbak user
#   3. Activates the key against license.omiiba.dev
#   4. Downloads + verifies + extracts the Premium tarball
#   5. Reloads pm2 so Premium handlers are picked up
#   6. Prints the post-install summary with the URL to open
#
# Idempotent: safe to re-run if any step fails.

set -euo pipefail

KEY="${1:-${QADBAK_LICENSE_KEY:-}}"
if [[ -z "$KEY" ]]; then
  cat <<EOF >&2
Usage: sudo bash $0 <LICENSE-KEY>

Example:
  sudo bash $0 QAD-1234-5678-9ABC-DEF0
EOF
  exit 2
fi

ROOT="${QADBAK_DIR:-/opt/qadbak}"
USER="${QADBAK_USER:-qadbak}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0 <KEY>" >&2
  exit 1
fi

if [[ ! -d "$ROOT" ]]; then
  echo "Qadbak install not found at $ROOT — set QADBAK_DIR or install first." >&2
  exit 1
fi

step() { echo ""; echo "==> $*"; }

step "1/5 Pull latest Qadbak"
cd "$ROOT"
bash "$ROOT/scripts/reset-git-drift-before-pull.sh"
bash "$ROOT/scripts/git-sync-origin.sh"
bash "$ROOT/scripts/fix-qadbak-ownership.sh"

step "2/5 Rebuild and restart"
sudo -u "$USER" bash -c "cd '$ROOT' && npm install && npm run build"
sudo -u "$USER" bash "$ROOT/scripts/pm2-restart-qadbak.sh"

# Wait briefly for pm2 to reach steady state — Activate calls the
# license server and writes to data/license.json which the panel reads.
sleep 2

step "3/5 Activate license"
ACTIVATE_OUT=$(sudo -u "$USER" bash -c "cd '$ROOT' && node scripts/qadbak-license-cli.mjs activate '$KEY'" 2>&1) || {
  echo "$ACTIVATE_OUT" >&2
  echo "License activation failed. Common causes:" >&2
  echo "  - Key already activated on another VPS (remove old slot at https://license.omiiba.dev first)" >&2
  echo "  - Network: this server can't reach license.omiiba.dev" >&2
  exit 1
}
echo "$ACTIVATE_OUT"

step "4/5 Sync Premium bundle"
SYNC_OUT=$(sudo -u "$USER" bash -c "cd '$ROOT' && node scripts/qadbak-license-cli.mjs sync" 2>&1) || {
  echo "$SYNC_OUT" >&2
  echo ""
  echo "Premium sync failed AFTER successful activation. Your license is" >&2
  echo "active but the artifact couldn't be downloaded." >&2
  echo "" >&2
  echo "Open https://$(hostname -f)/admin/license and click Refresh modules" >&2
  echo "for a diagnostic message (e.g. 'license server has no build for vX.Y')." >&2
  exit 1
}
echo "$SYNC_OUT"

step "5/5 Reload panel"
sudo -u "$USER" bash "$ROOT/scripts/pm2-restart-qadbak.sh"

echo ""
echo "──────────────────────────────────────────────────────────────"
echo "  Premium is now active on this server."
echo ""
echo "  Open:   https://$(hostname -f)/admin/license"
echo "  Status: Premium modules should show as installed."
echo "  Try:    /admin/updates, /admin/clients, /admin/resellers"
echo "──────────────────────────────────────────────────────────────"
