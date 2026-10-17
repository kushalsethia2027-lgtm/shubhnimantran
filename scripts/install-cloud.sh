#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Keep all tool/cache changes outside tracked application files.
if [[ -d /workspace ]]; then
 tools="${NIMANTRAN_TOOLS_DIR:-/workspace/.cloud-tools}"
 cache="${NIMANTRAN_CACHE_DIR:-/workspace/.bun-cache}"
 npm_cache="/workspace/.npm-cache"
else
 tools="${NIMANTRAN_TOOLS_DIR:-${TMPDIR:-/tmp}/nimantran-tools}"
 cache="${NIMANTRAN_CACHE_DIR:-${TMPDIR:-/tmp}/nimantran-bun-cache}"
 npm_cache="${TMPDIR:-/tmp}/nimantran-npm-cache"
fi
npm install --cache "$npm_cache" --prefix "$tools" --no-package-lock bun@1.3.14
export BUN_INSTALL_CACHE_DIR="$cache"
seed="$tools/lovable-cache-seed"
mkdir -p "$seed"
cat > "$seed/package.json" <<'JSON'
{"private":true,"dependencies":{"@lovable.dev/vite-tanstack-config":"2.26.5"}}
JSON
# npm's artifact has the same SHA-512 as bun.lock. Bun verifies the locked
# integrity when consuming this cache. Never disable signature/TLS checks.
"$tools/node_modules/.bin/bun" install --cwd "$seed" --ignore-scripts
"$tools/node_modules/.bin/bun" install --frozen-lockfile
