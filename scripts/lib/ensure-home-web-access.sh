#!/usr/bin/env bash
# Let nginx (www-data) traverse /home/USER and read public_html.
set -euo pipefail

ensure_home_web_access() {
  local user="${1:?unix user}"
  local home="/home/${user}"
  local pub="${home}/public_html"

  [[ -d "$home" ]] || return 0

  # Traverse: other needs +x on home (and homes/ for mail layouts).
  chmod u+rx,g+rx,o+rx "$home" 2>/dev/null || chmod 711 "$home" 2>/dev/null || true
  if [[ -d "${home}/homes" ]]; then
    chmod u+rx,g+rx,o+rx "${home}/homes" 2>/dev/null || chmod 711 "${home}/homes" 2>/dev/null || true
  fi

  if [[ -d "$pub" ]]; then
    find "$pub" -type d -exec chmod 755 {} \; 2>/dev/null || true
    find "$pub" -type f -exec chmod 644 {} \; 2>/dev/null || true
    chown -R "${user}:${user}" "$pub" 2>/dev/null || true
  fi
}
