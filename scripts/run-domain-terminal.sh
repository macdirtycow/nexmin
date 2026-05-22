#!/bin/bash
# Start an interactive login shell as a VirtualMin domain unix user (root-only entry).
# Usage: run-domain-terminal.sh UNIX_USER
set -euo pipefail

USER="${1:-}"
if [[ -z "$USER" || ! "$USER" =~ ^[a-z][a-z0-9._-]{0,31}$ ]]; then
  echo "Invalid unix user." >&2
  exit 1
fi

if ! id "$USER" &>/dev/null; then
  echo "User does not exist: $USER" >&2
  exit 1
fi

HOME_DIR="$(getent passwd "$USER" | cut -d: -f6)"
if [[ -z "$HOME_DIR" || "$HOME_DIR" != /home/* ]]; then
  echo "Home must be under /home/." >&2
  exit 1
fi

cd "$HOME_DIR" || exit 1
export HOME="$HOME_DIR"
export USER="$USER"
export LOGNAME="$USER"
exec /bin/bash -l
