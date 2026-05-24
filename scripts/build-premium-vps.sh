#!/usr/bin/env bash
# OPERATOR ONLY — build Premium on YOUR VPS and sync to local license server + panel.
# License customers never run this; they use Activate + Refresh modules only.
set -euo pipefail

QADBAK_DIR="${QADBAK_DIR:-/opt/qadbak}"
PREMIUM_DIR="${QADBAK_PREMIUM_DIR:-/opt/qadbak-premium}"
ENV_FILE="${QADBAK_LICENSE_ENV:-/etc/qadbak/license-server.env}"

[[ "$(id -u)" -eq 0 ]] || {
  echo "Run as root: sudo bash $0" >&2
  exit 1
}

[[ -d "$PREMIUM_DIR" ]] || {
  echo "Missing $PREMIUM_DIR — clone with SSH: git clone git@github.com:macdirtycow/qadbak-premium.git" >&2
  exit 1
}

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
  export LICENSE_SERVER="${LICENSE_SERVER:-http://127.0.0.1:${LICENSE_PORT:-8787}}"
  export LICENSE_ARTIFACTS_DIR="${LICENSE_ARTIFACTS_DIR:-/opt/qadbak-license-server/data/artifacts}"
fi

if [[ -f "$QADBAK_DIR/scripts/ensure-premium-git-ssh.sh" ]]; then
  bash "$QADBAK_DIR/scripts/ensure-premium-git-ssh.sh"
fi

echo "==> Update qadbak-premium (SSH)"
git -C "$PREMIUM_DIR" fetch origin main
git -C "$PREMIUM_DIR" merge --ff-only origin/main

echo "==> Fix legacy flat artifact path (if any)"
if [[ -f "$QADBAK_DIR/scripts/fix-license-artifact-layout.sh" ]]; then
  bash "$QADBAK_DIR/scripts/fix-license-artifact-layout.sh" "${LICENSE_ARTIFACTS_DIR}" || true
fi

echo "==> build:release"
cd "$PREMIUM_DIR"
npm install --no-audit --no-fund
npm run build:release

VER="$(node -p "require('$PREMIUM_DIR/package.json').version")"
ART_BASE="${LICENSE_ARTIFACTS_DIR:-$PREMIUM_DIR/license-server/data/artifacts}"
ART="${ART_BASE%/}/$VER/premium.tar.gz"
if [[ ! -f "$ART" ]]; then
  ART="$PREMIUM_DIR/license-server/data/artifacts/$VER/premium.tar.gz"
fi
if [[ ! -f "$ART" ]]; then
  echo "FAIL: artifact not found under $ART_BASE/$VER/ or premium repo" >&2
  echo "      Run: sudo bash $QADBAK_DIR/scripts/fix-license-artifact-layout.sh" >&2
  exit 1
fi
echo "OK — artifact $ART ($(du -h "$ART" | awk '{print $1}'))"

echo "==> Restart license server (pick up new files)"
pm2 restart qadbak-license 2>/dev/null || true

echo "==> Sync to panel"
sudo -u qadbak bash -c "
  set -a
  source '$QADBAK_DIR/.env.local'
  export QADBAK_SKIP_SIGNATURE_VERIFY=true
  set +a
  cd '$QADBAK_DIR'
  node scripts/sync-premium-artifact.mjs
"
bash "$QADBAK_DIR/scripts/pm2-restart-qadbak.sh"
echo "Done — open Server admin → Updates"
