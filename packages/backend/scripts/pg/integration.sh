#!/usr/bin/env bash
# B2.2a: PostgreSQL integration run. Creates a throwaway database, applies
# migrations-pg with the PostgreSQL runner (twice: the second run must apply
# nothing), compares the schema with a fresh SQLite build, runs
# test/pg-identity.integration.test.mjs and (B2.2b)
# test/pg-auth-teams.integration.test.mjs and (B2.2b-2)
# test/pg-credentials.integration.test.mjs and (B2.2b-3)
# test/pg-agents-tasks.integration.test.mjs and (B2.2b-4)
# test/pg-memory.integration.test.mjs and (B2.2c part 1)
# test/pg-platform.integration.test.mjs and (B2.2c part 2)
# test/pg-routes.integration.test.mjs and test/pg-boot.integration.test.mjs and (B2.2d-9)
# test/pg-claude-import.integration.test.mjs
# against it, then always drops it.
#
# Usage: scripts/pg/integration.sh [report-dir]
# Touches only the database named below on 127.0.0.1, as the current OS user.
set -euo pipefail

HOST=127.0.0.1
PORT=5432
DB=agent_player_rehearsal
HERE="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$(cd "$HERE/../.." && pwd)"
OUT_DIR="${1:-$(mktemp -d)}"
mkdir -p "$OUT_DIR"

pg_isready -h "$HOST" -p "$PORT"

exists() { psql -h "$HOST" -p "$PORT" -X -lqt | cut -d '|' -f 1 | tr -d ' ' | grep -qx "$DB"; }

if exists; then
  echo "database $DB already exists; refusing to touch it" >&2
  exit 2
fi

cleanup() {
  local rc=$?
  dropdb -h "$HOST" -p "$PORT" --if-exists "$DB" || true
  if exists; then echo "cleanup: $DB STILL EXISTS" >&2; else echo "cleanup: $DB dropped (not in psql -lqt)"; fi
  exit "$rc"
}

createdb -h "$HOST" -p "$PORT" "$DB"
trap cleanup EXIT
echo "created $DB"

URL="postgres://$HOST:$PORT/$DB"
cd "$BACKEND"
export PGOPTIONS="-c client_min_messages=warning"
AGENT_PLAYER_PG_URL="$URL" node --import tsx scripts/pg/migrate-pg.mjs | tail -n 1
AGENT_PLAYER_PG_URL="$URL" node --import tsx scripts/pg/migrate-pg.mjs | tail -n 1

node scripts/pg/compare-schema.mjs --host "$HOST" --db "$DB" --out "$OUT_DIR/compare-report.txt"

AGENT_PLAYER_PG_TEST_URL="$URL" node --import tsx --test test/pg-identity.integration.test.mjs 2>&1 | tee "$OUT_DIR/integration-output.txt"
test "${PIPESTATUS[0]}" -eq 0
AGENT_PLAYER_PG_TEST_URL="$URL" node --import tsx --test test/pg-auth-teams.integration.test.mjs 2>&1 | tee "$OUT_DIR/integration-auth-teams-output.txt"
test "${PIPESTATUS[0]}" -eq 0
AGENT_PLAYER_PG_TEST_URL="$URL" node --import tsx --test test/pg-credentials.integration.test.mjs 2>&1 | tee "$OUT_DIR/integration-credentials-output.txt"
test "${PIPESTATUS[0]}" -eq 0
AGENT_PLAYER_PG_TEST_URL="$URL" node --import tsx --test test/pg-agents-tasks.integration.test.mjs 2>&1 | tee "$OUT_DIR/integration-agents-tasks-output.txt"
test "${PIPESTATUS[0]}" -eq 0
AGENT_PLAYER_PG_TEST_URL="$URL" node --import tsx --test test/pg-memory.integration.test.mjs 2>&1 | tee "$OUT_DIR/integration-memory-output.txt"
test "${PIPESTATUS[0]}" -eq 0
AGENT_PLAYER_PG_TEST_URL="$URL" node --import tsx --test test/pg-platform.integration.test.mjs 2>&1 | tee "$OUT_DIR/integration-platform-output.txt"
test "${PIPESTATUS[0]}" -eq 0
AGENT_PLAYER_PG_TEST_URL="$URL" node --import tsx --test test/pg-routes.integration.test.mjs 2>&1 | tee "$OUT_DIR/integration-routes-output.txt"
test "${PIPESTATUS[0]}" -eq 0
AGENT_PLAYER_PG_TEST_URL="$URL" node --import tsx --test test/pg-boot.integration.test.mjs 2>&1 | tee "$OUT_DIR/integration-boot-output.txt"
test "${PIPESTATUS[0]}" -eq 0
AGENT_PLAYER_PG_TEST_URL="$URL" node --import tsx --test test/pg-claude-import.integration.test.mjs 2>&1 | tee "$OUT_DIR/integration-claude-import-output.txt"
test "${PIPESTATUS[0]}" -eq 0
echo "reports in $OUT_DIR"
