#!/usr/bin/env bash
# Fix Maildir ownership and move stuck tmp messages into cur/ (Dovecot LMTP leftovers).
set -euo pipefail
ROOT="${QADBAK_DIR:-/opt/qadbak}"
DOMAIN="${1:?domain}"
USER_LOCAL="${2:-info}"

[[ -f "$ROOT/.env.local" ]] && source "$ROOT/.env.local"

UHOME="$(getent passwd "$USER_LOCAL" | cut -d: -f6)"
OWNER="$(grep -o '"user":"[^"]*"' "$ROOT/data/native-domains.json" 2>/dev/null | head -1 | sed 's/"user":"//;s/"//' || true)"
GROUP="${OWNER:-$USER_LOCAL}"

echo "==> Maildir $UHOME/Maildir"
mkdir -p "$UHOME/Maildir"/{cur,new,tmp}
chown -R "${USER_LOCAL}:${GROUP}" "$UHOME/Maildir"
chmod -R u+rwX,g+rwX "$UHOME/Maildir"

moved=0
if [[ -d "$UHOME/Maildir/tmp" ]]; then
  shopt -s nullglob
  for f in "$UHOME/Maildir/tmp"/*; do
    [[ -f "$f" ]] || continue
    base="$(basename "$f")"
    if [[ ! "$base" =~ :2, ]]; then
      base="${base}:2,S"
    fi
    mv "$f" "$UHOME/Maildir/cur/$base"
    moved=$((moved + 1))
  done
  shopt -u nullglob
fi

echo "    moved $moved file(s) from tmp → cur"
for sub in new cur tmp; do
  n="$(find "$UHOME/Maildir/$sub" -type f 2>/dev/null | wc -l | tr -d ' ')"
  echo "    $sub: $n file(s)"
done

echo "==> mail-sync"
sudo -u "${QADBAK_USER:-qadbak}" sudo -n "$ROOT/scripts/run-provisioning-helper.sh" mail-sync | tail -1

echo "==> local delivery test"
bash "$ROOT/scripts/test-mail-receive.sh" "$DOMAIN" "$USER_LOCAL" || true
