#!/usr/bin/env bash
# Cache zoneFile for every domain in native-domains.json (or from VirtualMin).
set -euo pipefail
QADBAK_DIR="${QADBAK_DIR:-/opt/qadbak}"
REG="$QADBAK_DIR/data/native-domains.json"

domains=()
if [[ -f "$REG" ]]; then
  NODE_BIN="${QADBAK_NODE_BIN:-$(command -v node)}"
  [[ -n "$NODE_BIN" ]] && mapfile -t domains < <(
    "$NODE_BIN" -e "JSON.parse(require('fs').readFileSync('$REG','utf8')).map(r=>r.name).join('\n')"
  )
fi
if [[ ${#domains[@]} -eq 0 ]] && command -v virtualmin &>/dev/null; then
  mapfile -t domains < <(virtualmin list-domains --name-only 2>/dev/null | sed '/^$/d')
fi

[[ ${#domains[@]} -gt 0 ]] || { echo "No domains to discover" >&2; exit 1; }

for d in "${domains[@]}"; do
  bash "$QADBAK_DIR/scripts/discover-bind-zone.sh" "$d" || echo "WARN: $d" >&2
done
echo "Done — bind zone discovery"
