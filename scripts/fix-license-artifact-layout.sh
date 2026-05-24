#!/usr/bin/env bash
# Move premium.tar.gz from flat artifacts/ dir into artifacts/VERSION/ (legacy layout fix).
set -euo pipefail

BASE="${1:-${LICENSE_ARTIFACTS_DIR:-/opt/qadbak-license-server/data/artifacts}}"
VER="${2:-$(node -p "require('/opt/qadbak-premium/package.json').version" 2>/dev/null || echo 0.1.0)}"

FLAT="$BASE/premium.tar.gz"
DEST_DIR="$BASE/$VER"
DEST="$DEST_DIR/premium.tar.gz"

if [[ ! -f "$FLAT" ]]; then
  if [[ -f "$DEST" ]]; then
    echo "OK — already at $DEST"
    exit 0
  fi
  echo "No flat artifact at $FLAT" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"
mv "$FLAT" "$DEST"
[[ -f "$BASE/premium.tar.gz.sig" ]] && mv "$BASE/premium.tar.gz.sig" "$DEST_DIR/premium.tar.gz.sig"
echo "OK — moved to $DEST"
