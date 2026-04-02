#!/bin/sh
echo "=== ENTRYPOINT STARTED ==="

echo "Running Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy 2>&1 || echo "Migration failed or no pending migrations"
echo "=== MIGRATIONS DONE ==="

echo "Starting server..."
exec node server.js
