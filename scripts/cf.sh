#!/usr/bin/env bash
# Pokreće naredbu s Cloudflare pristupom za račun educore-hr.
# Wrangler prijava ovog projekta čuva se u .cf-auth/ (izvan gita), odvojeno od globalne prijave
# na ovom računalu (drugi projekti koriste druge Cloudflare račune).
set -euo pipefail
cd "$(dirname "$0")/.."
export XDG_CONFIG_HOME="$PWD/.cf-auth"
mkdir -p "$XDG_CONFIG_HOME"
if [ -f .env.cloudflare ]; then
  set -a; . ./.env.cloudflare; set +a
fi
exec "$@"
