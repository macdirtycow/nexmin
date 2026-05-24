#!/usr/bin/env bash
# Verify this host is a supported Ubuntu LTS for Qadbak native stack.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/ubuntu-release.sh
source "$ROOT/scripts/lib/ubuntu-release.sh"

pass() { echo "  OK   $1"; }
fail() { echo "  FAIL $1"; FAILED=1; }
warn() { echo "  WARN $1"; }

FAILED=0

echo "==> Qadbak Ubuntu support check"

if qadbak_detect_ubuntu_release; then
  pass "$(qadbak_ubuntu_release_label)"
else
  fail "Unsupported or non-Ubuntu OS (need 22.04 or 24.04 LTS)"
  exit 1
fi

echo ""
echo "==> Required commands"
for cmd in apt-get systemctl curl git nginx apache2 node npm; do
  if command -v "$cmd" &>/dev/null; then
    pass "$cmd"
  else
    warn "$cmd not installed yet (run install-native-stack.sh)"
  fi
done

echo ""
echo "==> BIND package names"
if apt-cache show bind9 &>/dev/null; then pass "bind9"; else fail "bind9 package missing"; fi
BIND_PKGS="$(qadbak_bind_apt_packages)"
if apt-cache show ${BIND_PKGS#bind9 } &>/dev/null 2>&1 || apt-cache show bind9-utils &>/dev/null || apt-cache show bind9utils &>/dev/null; then
  pass "BIND utils ($BIND_PKGS)"
else
  fail "Neither bind9utils nor bind9-utils found in apt"
fi

echo ""
echo "==> PHP-FPM versions"
FOUND=0
for v in 8.4 8.3 8.2 8.1; do
  if [[ -d "/etc/php/${v}/fpm" ]]; then
    pass "PHP ${v}-fpm"
    FOUND=1
  fi
done
[[ "$FOUND" -eq 1 ]] || warn "No /etc/php/*/fpm — install php-fpm"

echo ""
echo "==> Mail (optional)"
for svc in postfix dovecot; do
  systemctl is-active "$svc" &>/dev/null && pass "$svc active" || warn "$svc not active"
done

if [[ "$FAILED" -eq 0 ]]; then
  echo ""
  echo "OK — host looks compatible with Qadbak on $(qadbak_ubuntu_release_label)"
else
  echo ""
  echo "FAIL — fix items above before production cutover"
  exit 1
fi
