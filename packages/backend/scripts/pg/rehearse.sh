#!/usr/bin/env bash
# B2.1 rehearsal: create a throwaway PostgreSQL database, apply the translated
# migrations, compare the schema with a fresh SQLite build, run the smoke
# test, then always drop the database again.
#
# Usage: scripts/pg/rehearse.sh [report-dir]
# Touches only the database named below on 127.0.0.1, as the current OS user.
set -euo pipefail

HOST=127.0.0.1
DB=agent_player_rehearsal
HERE="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$(cd "$HERE/../.." && pwd)"
OUT_DIR="${1:-$(mktemp -d)}"
mkdir -p "$OUT_DIR"

pg_isready -h "$HOST" -p 5432

exists() { psql -h "$HOST" -X -lqt | cut -d '|' -f 1 | tr -d ' ' | grep -qx "$DB"; }

if exists; then
  echo "database $DB already exists; refusing to touch it" >&2
  exit 2
fi

cleanup() {
  local rc=$?
  dropdb -h "$HOST" --if-exists "$DB" || true
  if exists; then echo "cleanup: $DB STILL EXISTS" >&2; else echo "cleanup: $DB dropped (not in psql -lqt)"; fi
  exit "$rc"
}

createdb -h "$HOST" "$DB"
trap cleanup EXIT
echo "created $DB"

node "$BACKEND/scripts/pg/translate-migrations.mjs" --check

PSQL=(psql -h "$HOST" -d "$DB" -X -q -v ON_ERROR_STOP=1)
export PGOPTIONS="-c client_min_messages=warning"
n=0
for f in "$BACKEND"/src/db/migrations-pg/*.sql; do
  "${PSQL[@]}" -1 -f "$f" > /dev/null
  n=$((n + 1))
done
# Later starts run schema.sql again (adds indexes on tables rebuilt by migrations).
"${PSQL[@]}" -1 -f "$BACKEND/src/db/migrations-pg/000_schema.sql" > /dev/null
echo "applied $n files (+ 000_schema.sql again, steady state)"

node "$BACKEND/scripts/pg/compare-schema.mjs" --host "$HOST" --db "$DB" --out "$OUT_DIR/compare-report.txt"

PGOPTIONS="-c client_min_messages=notice" "${PSQL[@]}" -f "$BACKEND/scripts/pg/smoke.sql" 2>&1 | tee "$OUT_DIR/smoke-output.txt"
echo "reports in $OUT_DIR"
