#!/bin/sh
# NOTE: Do NOT use set -e — we handle errors manually in the retry loop

echo "========================================="
echo " Nakama Server — Container Startup"
echo "========================================="
echo ""

# Default values (overridden by environment variables)
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASS="${POSTGRES_PASSWORD:-localdb}"
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-nakama}"
SERVER_KEY="${NAKAMA_SERVER_KEY:-tictactoe_server_key}"
CONSOLE_USER="${NAKAMA_CONSOLE_USERNAME:-admin}"
CONSOLE_PASS="${NAKAMA_CONSOLE_PASSWORD:-password}"

DB_ADDR="${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?connect_timeout=5"

# Logging (mask password)
echo "[config] DB_HOST     = ${DB_HOST}"
echo "[config] DB_PORT     = ${DB_PORT}"
echo "[config] DB_NAME     = ${DB_NAME}"
echo "[config] DB_USER     = ${DB_USER}"
echo "[config] DB_PASS     = ********"
echo "[config] SERVER_KEY  = ********"
echo "[config] CONSOLE_USER= ${CONSOLE_USER}"
echo ""

# Check that nakama binary exists
if [ ! -f /nakama/nakama ]; then
  echo "[ERROR] /nakama/nakama binary not found!"
  ls -la /nakama/
  exit 1
fi

# Check that config exists
if [ ! -f /nakama/data/local.yml ]; then
  echo "[ERROR] /nakama/data/local.yml not found!"
  ls -la /nakama/data/
  exit 1
fi

# Check modules
echo "[check] Nakama modules:"
ls -la /nakama/data/modules/build/ 2>/dev/null || echo "  (no modules found)"
echo ""

# Wait for PostgreSQL by attempting migration with timeout
echo "[step 0/2] Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
echo "[step 0/2] Using nakama migrate with connect_timeout=5 as connectivity test"
echo ""

MAX_RETRIES=30
RETRY=0
MIGRATION_DONE=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  RETRY=$((RETRY + 1))
  echo "[step 0/2] Attempt ${RETRY}/${MAX_RETRIES}..."

  MIGRATE_OUTPUT=$(/nakama/nakama migrate up --database.address "$DB_ADDR" 2>&1) && {
    echo "[step 0/2] Migration succeeded!"
    echo "$MIGRATE_OUTPUT"
    MIGRATION_DONE=1
    break
  }
  MIGRATE_EXIT=$?
  echo "  Migration failed (exit ${MIGRATE_EXIT}): ${MIGRATE_OUTPUT}"
  echo "  Retrying in 5s..."
  sleep 5
done

if [ "$MIGRATION_DONE" != "1" ]; then
  echo "[ERROR] Could not connect to PostgreSQL after ${MAX_RETRIES} attempts"
  echo "[DEBUG] Full DB_ADDR (masked): ${DB_USER}:****@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  echo "[DEBUG] All env vars with POSTGRES:"
  env | grep -i postgres || true
  exit 1
fi
echo ""

echo "[step 1/2] Migrations complete."
echo ""

# Build address without connect_timeout for the running server
DB_ADDR_RUN="${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "[step 2/2] Starting Nakama server..."
exec /nakama/nakama \
  --config /nakama/data/local.yml \
  --database.address "$DB_ADDR_RUN" \
  --socket.server_key "$SERVER_KEY" \
  --console.username "$CONSOLE_USER" \
  --console.password "$CONSOLE_PASS"
