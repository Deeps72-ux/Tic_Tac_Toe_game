#!/bin/sh
set -e

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

DB_ADDR="${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

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

# Wait for PostgreSQL to be reachable
echo "[step 0/2] Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
MAX_RETRIES=30
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  # Try multiple methods to check connectivity
  if nc -z -w 2 "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    echo "[step 0/2] PostgreSQL is reachable (nc)!"
    break
  elif wget -q --spider --timeout=2 "http://${DB_HOST}:${DB_PORT}" 2>/dev/null; then
    echo "[step 0/2] PostgreSQL is reachable (wget)!"
    break
  elif /nakama/nakama migrate up --database.address "$DB_ADDR" 2>/dev/null; then
    echo "[step 0/2] PostgreSQL is reachable (migration test succeeded)!"
    MIGRATION_DONE=1
    break
  fi
  RETRY=$((RETRY + 1))
  echo "[step 0/2] Attempt ${RETRY}/${MAX_RETRIES} — PostgreSQL not reachable, retrying in 5s..."
  sleep 5
done

if [ $RETRY -eq $MAX_RETRIES ]; then
  echo "[ERROR] Could not connect to PostgreSQL at ${DB_HOST}:${DB_PORT} after ${MAX_RETRIES} attempts"
  echo "[DEBUG] Trying DNS lookup..."
  nslookup "$DB_HOST" 2>&1 || echo "[DEBUG] nslookup not available"
  echo "[DEBUG] Trying wget connectivity test..."
  wget -q -O - --timeout=5 "http://${DB_HOST}:${DB_PORT}" 2>&1 || true
  exit 1
fi
echo ""

echo "[step 1/2] Running database migrations..."
if [ "${MIGRATION_DONE:-0}" = "1" ]; then
  echo "[step 1/2] Migrations already completed during connectivity check."
else
  /nakama/nakama migrate up --database.address "$DB_ADDR" 2>&1 || {
    echo "[ERROR] Migration failed with exit code $?"
    exit 1
  }
fi
echo "[step 1/2] Migrations complete."
echo ""

echo "[step 2/2] Starting Nakama server..."
exec /nakama/nakama \
  --config /nakama/data/local.yml \
  --database.address "$DB_ADDR" \
  --socket.server_key "$SERVER_KEY" \
  --console.username "$CONSOLE_USER" \
  --console.password "$CONSOLE_PASS"
