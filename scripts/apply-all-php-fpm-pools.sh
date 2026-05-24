#!/usr/bin/env bash
# Apply PHP-FPM pools + nginx vhosts for all native domains.
set -euo pipefail

QADBAK_DIR="${QADBAK_DIR:-/opt/qadbak}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/apply-all-php-fpm-pools.sh" >&2
  exit 1
fi

REG="$QADBAK_DIR/data/native-domains.json"
if [[ ! -f "$REG" ]]; then
  echo "No $REG — nothing to do." >&2
  exit 0
fi

if ! command -v jq &>/dev/null; then
  echo "jq required." >&2
  exit 1
fi

count=0
while IFS=$'\t' read -r domain user; do
  [[ -z "$domain" || -z "$user" ]] && continue
  ver=""
  if [[ -f "$QADBAK_DIR/data/domain-config/${domain}/php.json" ]]; then
    ver="$(jq -r '.defaultVersion // empty' "$QADBAK_DIR/data/domain-config/${domain}/php.json" 2>/dev/null || true)"
  fi
  echo "==> $domain ($user) PHP-FPM"
  bash "$QADBAK_DIR/scripts/apply-php-fpm-pool.sh" "$user" "${ver:-}" "/home/${user}" || echo "    WARN: pool failed for $user" >&2
  bash "$QADBAK_DIR/scripts/apply-domain-nginx.sh" "$domain" "$user" || echo "    WARN: nginx failed for $domain" >&2
  count=$((count + 1))
done < <(jq -r '.[] | [.name,.user] | @tsv' "$REG" 2>/dev/null)

echo "Done — processed $count domain(s)."
