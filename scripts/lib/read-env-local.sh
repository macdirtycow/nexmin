#!/usr/bin/env bash
# Read a single key from .env.local without sourcing (sourcing clobbers PORT=3000 over panel port).
read_env_local_key() {
  local key="$1"
  local default="${2:-}"
  local file="${QADBAK_DIR:-/opt/qadbak}/.env.local"
  local line val
  [[ -f "$file" ]] || {
    echo "$default"
    return
  }
  line="$(grep -E "^${key}=" "$file" 2>/dev/null | tail -1 || true)"
  [[ -n "$line" ]] || {
    echo "$default"
    return
  }
  val="${line#*=}"
  val="${val#\"}"
  val="${val%\"}"
  val="${val#\'}"
  val="${val%\'}"
  echo "${val:-$default}"
}
