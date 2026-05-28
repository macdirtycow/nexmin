#!/bin/bash
# Install PrestaShop under public_html (run as domain unix user).
set -euo pipefail
HOME_DIR="${1:?home}"
SUB="${2:-public_html}"
TARGET="$HOME_DIR/$SUB"
mkdir -p "$TARGET"
cd "$TARGET"
if [[ -f index.php ]] && grep -qi prestashop index.php 2>/dev/null; then
  echo "PrestaShop already present in $TARGET"
  exit 0
fi
VER="${PRESTASHOP_VERSION:-8.2.0}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
URL="https://github.com/PrestaShop/PrestaShop/releases/download/${VER}/prestashop.zip"
curl -fsSL "$URL" -o "$TMP/prestashop.zip"
unzip -q "$TMP/prestashop.zip" -d "$TMP/extract"
if [[ -f "$TMP/extract/prestashop/prestashop.zip" ]]; then
  unzip -q "$TMP/extract/prestashop/prestashop.zip" -d "$TARGET"
elif [[ -d "$TMP/extract/prestashop" ]]; then
  cp -a "$TMP/extract/prestashop/"* "$TARGET/"
else
  cp -a "$TMP/extract/"* "$TARGET/"
fi
echo "OK — PrestaShop in $TARGET (open the shop URL to run the web installer)"
