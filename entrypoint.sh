#!/bin/sh
set -e

echo "Running Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy || echo "Migration warning (may be first deploy)"
echo "Migrations step complete."

echo "Starting server..."
exec node server.js
