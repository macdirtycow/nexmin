#!/usr/bin/env bash
# Ensure Apache serves DOMAIN from /home/USER/public_html on the nginx backend port.
# Sourced by fix-domain-website.sh (requires ROOT, DOMAIN, VM_USER, PUB).
set -euo pipefail

fix_apache_vhost_for_domain() {
  local domain="$1"
  local user="$2"
  local pub="$3"
  local root="${4:-/opt/qadbak}"

  local backend="${APACHE_BACKEND:-}"
  if [[ -z "$backend" && -f "$root/scripts/detect-web-backend.sh" ]]; then
    backend="$(DETECT_DOMAIN="$domain" bash "$root/scripts/detect-web-backend.sh" 2>/dev/null | tail -1)"
  fi
  [[ -z "$backend" ]] && backend="127.0.0.1:8080"
  local port="${backend##*:}"

  echo "==> Apache vhost check (backend $backend, document root $pub)"

  if command -v apache2ctl &>/dev/null; then
    echo "    apache2ctl -S (matching lines):"
    apache2ctl -S 2>&1 | grep -E "${domain}|${port}|default|8080" | sed 's/^/      /' || {
      apache2ctl -S 2>&1 | tail -12 | sed 's/^/      /'
    }
  fi

  if [[ -f "$pub/index.html" ]]; then
    echo "    public_html/index.html exists ($(wc -c <"$pub/index.html") bytes)"
  else
    echo "    WARN — no $pub/index.html (upload or create in Qadbak Files)" >&2
  fi

  local has_vhost=0
  if grep -rq "ServerName[[:space:]].*${domain}" /etc/apache2/sites-available/ 2>/dev/null; then
    has_vhost=1
    echo "    legacy hosting API/Apache site file(s):"
    grep -l "ServerName[[:space:]].*${domain}" /etc/apache2/sites-available/* 2>/dev/null | sed 's/^/      /' || true
    grep -h "DocumentRoot" /etc/apache2/sites-available/*"${domain}"* 2>/dev/null | sed 's/^/      /' || \
      grep -h "DocumentRoot" /etc/apache2/sites-available/* 2>/dev/null | grep -i "$user" | sed 's/^/      /' || true
    for s in /etc/apache2/sites-available/*"${domain}"*; do
      [[ -f "$s" ]] || continue
      a2ensite "$(basename "$s")" 2>/dev/null || true
    done
  fi

  if command -v "${QADBAK_LEGACY_HOST_BIN:-}" &>/dev/null && [[ "$has_vhost" -eq 0 ]]; then
    echo "    Recreating web feature in legacy hosting API (no Apache vhost found)"
    legacy-host disable-feature --domain "$domain" --web 2>/dev/null || true
    legacy-host enable-feature --domain "$domain" --web
    legacy-host modify-web --domain "$domain" --document-dir public_html --fix-document-dir --fix-options 2>&1 || true
    if grep -rq "ServerName[[:space:]].*${domain}" /etc/apache2/sites-available/ 2>/dev/null; then
      has_vhost=1
    fi
  fi

  local vconf=""
  vconf="$(grep -rl "ServerName[[:space:]].*${domain}" /etc/apache2/sites-available/ 2>/dev/null | head -1 || true)"

  if [[ -z "$vconf" ]]; then
    echo "    Creating minimal Apache vhost (127.0.0.1:${port})"
    vconf="/etc/apache2/sites-available/qadbak-${domain}.conf"
    cat >"$vconf" <<VHOST
# Created by Qadbak — serves ${domain} from public_html
<VirtualHost 127.0.0.1:${port}>
    ServerName ${domain}
    ServerAlias www.${domain}
    DocumentRoot ${pub}
    <Directory ${pub}>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
VHOST
    a2ensite "$(basename "$vconf")" 2>/dev/null || true
  elif ! grep -qF "$pub" "$vconf"; then
    echo "    Patching DocumentRoot in $vconf → $pub"
    if grep -q "DocumentRoot" "$vconf"; then
      sed -i "s|^[[:space:]]*DocumentRoot.*|    DocumentRoot ${pub}|" "$vconf"
    else
      sed -i "/<VirtualHost/a\\    DocumentRoot ${pub}" "$vconf"
    fi
  fi

  if command -v a2dissite &>/dev/null; then
    a2dissite 000-default.conf 2>/dev/null || true
    a2dissite default.conf 2>/dev/null || true
  fi

  if command -v apache2ctl &>/dev/null; then
    apache2ctl configtest 2>&1 | sed 's/^/    /' || true
  fi
}

probe_web_root() {
  local domain="$1"
  local backend="${2:-127.0.0.1:8080}"
  local body
  body="$(mktemp)"
  local code
  code="$(curl -sS --max-time 8 -o "$body" -w '%{http_code}' -H "Host: ${domain}" "http://${backend}/" 2>/dev/null || echo 000)"
  if grep -qiE 'apache2 ubuntu default|/var/www/html|debian default page' "$body" 2>/dev/null; then
    echo "ubuntu-default"
  elif grep -qiE 'qadbak.*legacy-host|your hosting panel' "$body" 2>/dev/null; then
    echo "qadbak-landing"
  elif [[ "$code" =~ ^[0-9]+$ ]] && (( code >= 200 && code < 500 )); then
    echo "ok"
  else
    echo "fail"
  fi
  rm -f "$body"
}
