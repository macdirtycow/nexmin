#!/usr/bin/env bash
# Shared helpers — no hardcoded customer domain names.

_is_valid_domain() {
  [[ "$1" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$ ]]
}

_legacy_host_list_domains() {
  if ! command -v "${QADBAK_LEGACY_HOST_BIN:-}" &>/dev/null; then
    return 1
  fi
  if [[ "$(id -u)" -eq 0 ]]; then
    "${QADBAK_LEGACY_HOST_BIN}" list-domains --name-only 2>/dev/null
    return $?
  fi
  if sudo -n "${QADBAK_LEGACY_HOST_BIN}" list-domains --name-only 2>/dev/null; then
    return 0
  fi
  "${QADBAK_LEGACY_HOST_BIN}" list-domains --name-only 2>/dev/null
}

first_legacy_host_domain() {
  local d
  while read -r d; do
    [[ -z "$d" ]] && continue
    _is_valid_domain "$d" || continue
    echo "$d"
    return 0
  done < <(_legacy_host_list_domains | sed '/^$/d')
  return 1
}

# First domain for nginx probes: native registry, then legacy CLI.
first_panel_domain() {
  local reg="${QADBAK_DIR:-/opt/qadbak}/data/native-domains.json"
  local d=""
  if [[ -f "$reg" ]]; then
    if command -v jq &>/dev/null; then
      d="$(jq -r '.[0].name // empty' "$reg" 2>/dev/null | head -1)"
    else
      d="$(node -e "
        const fs = require('fs');
        const rows = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
        const name = Array.isArray(rows) && rows[0] ? rows[0].name : '';
        process.stdout.write(String(name || ''));
      " "$reg" 2>/dev/null || true)"
    fi
    if _is_valid_domain "$d"; then
      echo "$d"
      return 0
    fi
  fi
  if command -v "${QADBAK_LEGACY_HOST_BIN:-}" &>/dev/null; then
    first_legacy_host_domain
  fi
  return 1
}
