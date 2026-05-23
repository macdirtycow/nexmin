#!/usr/bin/env bash
# Sync GitHub repository "About" sidebar (description + homepage).
# Requires: gh auth login
set -euo pipefail

REPO="${GITHUB_REPO:-macdirtycow/qadbak}"
DESC="${QADBAK_GITHUB_DESCRIPTION:-Independent self-hosted hosting control panel — domains, mail, DNS, SSL (qadbak.com)}"
HOME="${QADBAK_GITHUB_HOMEPAGE:-https://qadbak.com}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: https://cli.github.com/" >&2
  exit 1
fi

gh repo edit "$REPO" --description "$DESC" --homepage "$HOME"
echo "OK — GitHub About updated for $REPO"
gh repo view "$REPO" --json description,homepageUrl
