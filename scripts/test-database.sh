#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
name="nimantran-test-${RANDOM}-$$"
# Isolated disposable DB: no port binding or production connection. Test auth/storage
# schemas model Supabase SQL contracts; this is not a Supabase Auth/Storage API test.
docker run --name "$name" -e POSTGRES_HOST_AUTH_METHOD=trust -d postgres:17-alpine >/dev/null
trap 'docker rm -f "$name" >/dev/null' EXIT
for attempt in $(seq 1 30); do
 if docker exec "$name" pg_isready -U postgres >/dev/null 2>&1; then break; fi
 sleep 1
done
for file in tests/db-bootstrap.sql supabase/migrations/*.sql tests/database.sql; do
 docker exec -i "$name" psql -U postgres -v ON_ERROR_STOP=1 < "$file"
done
