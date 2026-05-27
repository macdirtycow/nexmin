#!/usr/bin/env bash
# Find BIND zone file for a domain (legacy hosting API / Debian). Updates native-domains.json zoneFile.
set -euo pipefail
DOMAIN="${1:?domain}"
QADBAK_DIR="${QADBAK_DIR:-/opt/qadbak}"
REG="$QADBAK_DIR/data/native-domains.json"

echo "==> Discover BIND zone for $DOMAIN"

ZONE=""
for p in \
  "/var/lib/bind/${DOMAIN}.hosts" \
  "/var/lib/bind/${DOMAIN}.host" \
  "/var/lib/bind/${DOMAIN}" \
  "/etc/bind/${DOMAIN}.zone" \
  "/etc/bind/zones/${DOMAIN}"; do
  if [[ -f "$p" ]]; then
    ZONE="$p"
    break
  fi
done

if [[ -z "$ZONE" ]] && command -v "${QADBAK_LEGACY_HOST_BIN:-}" &>/dev/null; then
  ZONE="$("${QADBAK_LEGACY_HOST_BIN}" list-domains --domain "$DOMAIN" --multiline 2>/dev/null \
    | awk -F': *' '/^(DNS zone file|Zone file|Master file):/ {print $2; exit}')"
fi

if [[ -z "$ZONE" ]]; then
  ZONE="$(find /var/lib/bind /etc/bind -maxdepth 4 -type f \
    \( -name "${DOMAIN}.hosts" -o -name "${DOMAIN}.host" -o -name "${DOMAIN}.zone" -o -name "${DOMAIN}" \) 2>/dev/null | head -1)"
fi

if [[ -z "$ZONE" || ! -f "$ZONE" ]]; then
  echo "FAIL: no zone file found for $DOMAIN" >&2
  echo "  Check: named -v, "${QADBAK_LEGACY_HOST_BIN}" list-domains --domain $DOMAIN --multiline" >&2
  exit 1
fi

echo "OK — zone file: $ZONE"

if [[ -f "$REG" ]]; then
  NODE_BIN="${QADBAK_NODE_BIN:-$(command -v node)}"
  if [[ -n "$NODE_BIN" ]]; then
    QADBAK_DIR="$QADBAK_DIR" "$NODE_BIN" "$QADBAK_DIR/scripts/lib/patch-registry-zone.mjs" "$DOMAIN" "$ZONE" && \
      echo "    Updated $REG"
  else
    echo "    (node not found — run export-native-domains.sh)"
  fi
fi

echo "Test:"
sudo -u qadbak sudo -n "$QADBAK_DIR/scripts/run-provisioning-helper.sh" dns-get "$DOMAIN" | tail -1
