#!/usr/bin/env bash
# Build qadbak-site-upload.zip — a static fallback you can drop on any web host.
# In production qadbak.com is served by the Next.js app; this zip is for emergencies / mirrors.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$ROOT/marketing-site"
OUT="$ROOT/dist/qadbak-site-upload.zip"
TMP="$(mktemp -d)"
mkdir -p "$ROOT/dist"
rm -f "$OUT"
cp -R "$SITE/"* "$TMP/"

# Refresh CSS/JS from Next.js public assets when present so the bundled
# zip matches what's deployed on qadbak.com.
if [[ -f "$ROOT/public/landing.css" ]]; then
  cp "$ROOT/public/landing.css" "$TMP/assets/css/style.css"
fi
if [[ -f "$ROOT/public/landing.js" ]]; then
  cp "$ROOT/public/landing.js" "$TMP/assets/js/main.js"
fi

# Cross-platform sed -i wrapper (mac requires the empty backup-suffix arg).
sedi() {
  if sed --version >/dev/null 2>&1; then
    sed -i "$@"
  else
    sed -i '' "$@"
  fi
}

# Rewrite absolute paths to relative ones for static hosts that lack a panel app.
rewrite_root_html() {
  local f="$1"
  sedi \
    -e 's|href="/landing.css"|href="assets/css/style.css"|g' \
    -e 's|src="/landing.js"|src="assets/js/main.js"|g' \
    -e 's|href="/favicon.svg"|href="assets/img/favicon.svg"|g' \
    -e 's|href="/login"|href="https://qadbak.com/login"|g' \
    -e 's|href="/about"|href="about.html"|g' \
    -e 's|href="/privacy"|href="privacy/index.html"|g' \
    -e 's|href="/terms"|href="terms/index.html"|g' \
    -e 's|href="/refund"|href="refund/index.html"|g' \
    -e 's|<head>|<head>\n    <link rel="canonical" href="https://qadbak.com/" />|' \
    "$f"
}

rewrite_about_html() {
  local f="$1"
  sedi \
    -e 's|href="/landing.css"|href="../assets/css/style.css"|g' \
    -e 's|href="/favicon.svg"|href="../assets/img/favicon.svg"|g' \
    -e 's|href="/login"|href="https://qadbak.com/login"|g' \
    -e 's|href="/"|href="../"|g' \
    -e 's|href="/privacy"|href="../privacy/index.html"|g' \
    -e 's|href="/terms"|href="../terms/index.html"|g' \
    -e 's|href="/refund"|href="../refund/index.html"|g' \
    "$f"
}

# about.html sits at the ROOT in this layout — fix paths for THAT location.
if [[ -f "$TMP/about.html" ]]; then
  sedi \
    -e 's|href="/landing.css"|href="assets/css/style.css"|g' \
    -e 's|href="/favicon.svg"|href="assets/img/favicon.svg"|g' \
    -e 's|href="/login"|href="https://qadbak.com/login"|g' \
    -e 's|href="/"|href="index.html"|g' \
    -e 's|href="/privacy"|href="privacy/index.html"|g' \
    -e 's|href="/terms"|href="terms/index.html"|g' \
    -e 's|href="/refund"|href="refund/index.html"|g' \
    "$TMP/about.html"
fi

rewrite_root_html "$TMP/index.html"

# Legal pages live one directory deep — paths are relative to that subdir.
for slug in privacy terms refund; do
  legal_file="$TMP/$slug/index.html"
  if [[ -f "$legal_file" ]]; then
    rewrite_about_html "$legal_file"
  fi
done

(cd "$TMP" && zip -r "$OUT" . -x "*.DS_Store")
rm -rf "$TMP"
echo "Created $OUT ($(du -h "$OUT" | cut -f1))"
