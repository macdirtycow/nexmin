#!/usr/bin/env bash
# NOPASSWD sudo — stream a validated domain backup archive to stdout.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
QADBAK_DIR="${QADBAK_DIR:-$(dirname "$SCRIPT_DIR")}"
QADBAK_NODE_BIN="${QADBAK_NODE_BIN:-$(command -v node 2>/dev/null || echo /usr/bin/node)}"
DOMAIN="${1:-}"
NAME="${2:-}"
if [[ -z "$DOMAIN" || -z "$NAME" ]]; then
  echo "Usage: run-backup-download.sh <domain> <backup-file.tar.gz>" >&2
  exit 1
fi

ENV_FILE="$QADBAK_DIR/.env.local"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ENV_FILE"
  set +a
fi

line="$("$QADBAK_NODE_BIN" "$SCRIPT_DIR/provisioning-helper.mjs" backup-resolve "$DOMAIN" "$NAME" 2>/dev/null | tail -1)"
path="$("$QADBAK_NODE_BIN" -e "
const line = process.argv[1];
if (!line) process.exit(1);
let j;
try { j = JSON.parse(line); } catch { process.exit(1); }
if (!j.ok || !j.path) process.exit(1);
process.stdout.write(String(j.path));
" "$line")"

if [[ -z "$path" || ! -f "$path" ]]; then
  echo "Backup not found" >&2
  exit 1
fi

exec /bin/cat "$path"
