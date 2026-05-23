#!/usr/bin/env bash
# Dovecot IMAP diagnostics for Qadbak native imap module.
set -euo pipefail
ROOT="${QADBAK_DIR:-/opt/qadbak}"
DOMAIN="${1:-}"
USER_LOCAL="${2:-}"

[[ -f "$ROOT/.env.local" ]] && source "$ROOT/.env.local"

echo "==> Dovecot package"
if command -v doveadm &>/dev/null; then
  doveadm --version
else
  echo "FAIL — install: apt install dovecot-core dovecot-imapd" >&2
  exit 1
fi

echo "==> Dovecot service"
systemctl is-active dovecot 2>/dev/null || systemctl is-active dovecot-core 2>/dev/null || echo "WARN — dovecot not active"

if [[ -n "$DOMAIN" ]]; then
  echo "==> Qadbak imap-list $DOMAIN ${USER_LOCAL:-}"
  sudo -u "${QADBAK_USER:-qadbak}" sudo -n "$ROOT/scripts/run-provisioning-helper.sh" \
    imap-list "$DOMAIN" "${USER_LOCAL:-}" 2>&1 | tail -1 | python3 -m json.tool 2>/dev/null || true
fi

echo "OK — native IMAP uses doveadm (see docs/IMAP-NATIVE.md)"
