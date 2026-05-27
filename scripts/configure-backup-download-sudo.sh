#!/usr/bin/env bash
set -euo pipefail
QADBAK_DIR="${QADBAK_DIR:-/opt/qadbak}"
QADBAK_USER="${QADBAK_USER:-qadbak}"
[[ "$(id -u)" -eq 0 ]] || { echo "Run as root" >&2; exit 1; }

WRAPPER="$(readlink -f "$QADBAK_DIR/scripts/run-backup-download.sh")"
chmod 755 "$WRAPPER"

cat >"/etc/sudoers.d/qadbak-backup-download" <<EOF
# Qadbak backup download (stream ~/backups archives)
$QADBAK_USER ALL=(root) NOPASSWD: $WRAPPER *
EOF
chmod 440 "/etc/sudoers.d/qadbak-backup-download"
visudo -cf "/etc/sudoers.d/qadbak-backup-download"

if ! sudo -u "$QADBAK_USER" sudo -n -l 2>/dev/null | grep -qF "$WRAPPER"; then
  echo "FAILED backup download sudo" >&2
  exit 1
fi

echo "OK — $WRAPPER"
echo "     test: sudo -u $QADBAK_USER sudo -n $WRAPPER <domain> <file.tar.gz> | head -c 4 | xxd"
