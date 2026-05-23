#!/usr/bin/env bash
# Native mail diagnostics: Postfix, Dovecot, virtual maps, optional send test.
set -euo pipefail
ROOT="${QADBAK_DIR:-/opt/qadbak}"
DOMAIN="${1:-}"
USER_LOCAL="${2:-}"

[[ -f "$ROOT/.env.local" ]] && source "$ROOT/.env.local"

echo "==> Postfix"
systemctl is-active postfix 2>/dev/null || echo "WARN — postfix not active"
postconf -n home_mailbox virtual_alias_maps virtual_mailbox_domains 2>/dev/null || true

echo "==> Dovecot"
systemctl is-active dovecot 2>/dev/null || systemctl is-active dovecot-core 2>/dev/null || echo "WARN — dovecot not active"
command -v doveadm &>/dev/null && doveadm -V 2>/dev/null | head -1 || true

if [[ -f /etc/postfix/virtual_domains ]]; then
  echo "==> virtual_domains"
  cat /etc/postfix/virtual_domains | sed '/^$/d' | head -20
fi

if [[ -n "$DOMAIN" ]]; then
  echo "==> mail-diagnose $DOMAIN"
  OUT="$(sudo -u "${QADBAK_USER:-qadbak}" sudo -n "$ROOT/scripts/run-provisioning-helper.sh" \
    mail-diagnose "$DOMAIN" 2>&1 | tail -1)"
  echo "$OUT" | python3 -m json.tool 2>/dev/null || echo "$OUT"

  if [[ -n "$USER_LOCAL" ]]; then
    echo "==> imap-list $DOMAIN $USER_LOCAL"
    IMAP="$(sudo -u "${QADBAK_USER:-qadbak}" sudo -n "$ROOT/scripts/run-provisioning-helper.sh" \
      imap-list "$DOMAIN" "$USER_LOCAL" 2>&1 | tail -1)"
    echo "$IMAP" | python3 -m json.tool 2>/dev/null || echo "$IMAP"
  fi
fi

echo "OK — see docs/IMAP-NATIVE.md"
