#!/usr/bin/env bash
# Inbound mail diagnostics: Postfix hash domains, SMTP RCPT probe, local delivery test.
set -euo pipefail
ROOT="${QADBAK_DIR:-/opt/qadbak}"
DOMAIN="${1:-}"
USER_LOCAL="${2:-info}"

[[ -f "$ROOT/.env.local" ]] && source "$ROOT/.env.local"

echo "==> Postfix"
systemctl is-active postfix 2>/dev/null || echo "WARN — postfix not active"
postconf -n virtual_mailbox_domains virtual_alias_maps mailbox_transport 2>/dev/null || true

echo "==> Qadbak maps"
for f in /etc/postfix/qadbak-domains /etc/postfix/qadbak-virtual; do
  if [[ -f "$f" ]]; then
    echo "--- $f"
    sed '/^$/d' "$f" | head -15
  else
    echo "MISSING $f — run: sudo bash scripts/configure-native-mail.sh --force"
  fi
done

if [[ -n "$DOMAIN" ]]; then
  echo "==> mail-diagnose $DOMAIN"
  OUT="$(sudo -u "${QADBAK_USER:-qadbak}" sudo -n "$ROOT/scripts/run-provisioning-helper.sh" \
    mail-diagnose "$DOMAIN" 2>&1 | tail -1)"
  echo "$OUT" | python3 -m json.tool 2>/dev/null || echo "$OUT"

  echo "==> local delivery test"
  bash "$ROOT/scripts/test-mail-receive.sh" "$DOMAIN" "$USER_LOCAL" 2>/dev/null || true

  echo "==> imap-list $DOMAIN $USER_LOCAL"
  IMAP="$(sudo -u "${QADBAK_USER:-qadbak}" sudo -n "$ROOT/scripts/run-provisioning-helper.sh" \
    imap-list "$DOMAIN" "$USER_LOCAL" 2>&1 | tail -1)"
  echo "$IMAP" | python3 -m json.tool 2>/dev/null || echo "$IMAP"
fi

echo ""
echo "If SMTP RCPT fails: sudo bash scripts/configure-native-mail.sh --force"
echo "If RCPT OK but no external mail: open TCP 25 at provider + DNS MX (DNS only)"
