#!/usr/bin/env bash
# Use SSH for operator pulls of private qadbak-premium (no HTTPS PAT prompts).
set -euo pipefail

PREMIUM_DIR="${QADBAK_PREMIUM_DIR:-/opt/qadbak-premium}"
SSH_URL="git@github.com:macdirtycow/qadbak-premium.git"

[[ -d "$PREMIUM_DIR/.git" ]] || exit 0

current="$(git -C "$PREMIUM_DIR" remote get-url origin 2>/dev/null || true)"
if [[ "$current" == "$SSH_URL" ]]; then
  exit 0
fi

echo "==> Set qadbak-premium origin to SSH (was: ${current:-none})"
git -C "$PREMIUM_DIR" remote set-url origin "$SSH_URL"
