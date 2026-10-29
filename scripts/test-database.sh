#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
name="nimantran-test-${RANDOM}-$$"
# Isolated disposable DB: no port binding or production connection. Test auth/storage
# schemas model Supabase SQL contracts; this is not a Supabase Auth/Storage API test.
docker run --name "$name" -e POSTGRES_HOST_AUTH_METHOD=trust -d postgres:17-alpine >/dev/null
trap 'docker rm -f "$name" >/dev/null' EXIT
for attempt in $(seq 1 30); do
 if docker logs "$name" 2>&1 | rg -q "init process complete" && docker exec "$name" pg_isready -U postgres >/dev/null 2>&1; then break; fi
 sleep 1
done
files=(tests/db-bootstrap.sql)
if [[ "${1:-}" == "--setup" ]]; then
 files+=(supabase/setup.sql)
else
 files+=(supabase/migrations/*.sql)
fi
files+=(tests/database.sql)
if [[ "${1:-}" != "--setup" ]]; then files+=(tests/planner-database.sql); fi
for file in "${files[@]}"; do
 docker exec -i "$name" psql -U postgres -v ON_ERROR_STOP=1 < "$file"
done
