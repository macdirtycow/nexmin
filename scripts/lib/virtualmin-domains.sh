#!/usr/bin/env bash
# Shared helpers — no hardcoded customer domain names.
first_virtualmin_domain() {
  if ! command -v virtualmin &>/dev/null; then
    return 1
  fi
  virtualmin list-domains --name-only 2>/dev/null | sed '/^$/d' | head -1
}
