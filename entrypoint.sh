#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy
echo "Migrations complete."

echo "Starting BullMQ workers..."
node workers/start-all.js &
WORKER_PID=$!
echo "Workers started (PID: $WORKER_PID)"

echo "Starting server..."
exec node server.js
