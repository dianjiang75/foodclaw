#!/bin/bash
# Backup the FoodClaw database. Run before ANY data modification.
# Usage: ./scripts/backup-db.sh [label]
set -e
export PATH="/opt/homebrew/opt/postgresql@17/bin:/opt/homebrew/bin:$PATH"
source "$(dirname "$0")/../.env"

LABEL="${1:-manual}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"

FILENAME="$BACKUP_DIR/db-$LABEL-$TIMESTAMP.dump"
pg_dump "$DATABASE_URL" -F c -f "$FILENAME"

SIZE=$(du -h "$FILENAME" | cut -f1)
echo "✅ Backup saved: $FILENAME ($SIZE)"
echo "   Restore with: pg_restore -d \"\$DATABASE_URL\" --clean $FILENAME"

# Keep only last 10 backups
cd "$BACKUP_DIR" && ls -t *.dump 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null
echo "   (Keeping last 10 backups)"
