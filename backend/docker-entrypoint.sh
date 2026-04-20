#!/bin/sh
set -e

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

echo "Running database migrations..."
/nakama/nakama migrate up --database.address "$DB_ADDR"

echo "Starting Nakama server..."
exec /nakama/nakama \
  --config /nakama/data/local.yml \
  --database.address "$DB_ADDR" \
  --socket.server_key "$SERVER_KEY" \
  --console.username "$CONSOLE_USER" \
  --console.password "$CONSOLE_PASS"
