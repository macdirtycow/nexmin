#!/bin/bash
# Install Ghost (Node.js) under ~/ghost or public_html/ghost (run as domain unix user).
set -euo pipefail
HOME_DIR="${1:?home}"
SUB="${2:-ghost}"
DIR="$HOME_DIR/$SUB"
PARENT="$(dirname "$DIR")"
NAME="$(basename "$DIR")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ is required — install Node on the host or use Domains → Runtimes" >&2
  exit 1
fi
NODE_MAJOR="$(node -p "parseInt(process.versions.node.split('.')[0], 10)" 2>/dev/null || echo 0)"
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  echo "Node.js 18+ required (found v$(node -v 2>/dev/null || echo unknown))" >&2
  exit 1
fi

if [[ -f "$DIR/config.production.json" ]] || [[ -d "$DIR/versions" ]]; then
  echo "Ghost already present in $DIR"
  exit 0
fi

mkdir -p "$PARENT"
cd "$PARENT"
export NODE_ENV=production
# Non-interactive local install (SQLite). Switch to MySQL in config after intent-install DB creds.
npx --yes ghost-cli@latest install "$NAME" \
  --dir "$PARENT" \
  --db sqlite3 \
  --no-start \
  --no-prompt \
  --no-stack \
  --no-setup

echo "OK — Ghost in $DIR (default SQLite). Run: cd $DIR && ghost config url https://YOUR-DOMAIN && ghost setup && ghost start"
echo "Proxy port 2368 via Domains → Runtimes or nginx."
