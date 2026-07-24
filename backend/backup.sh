#!/bin/bash
# Database backup script

BACKUP_DIR="./backups"
DB_PATH="./db/everfresh.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

if [ -f "$DB_PATH" ]; then
  cp $DB_PATH "$BACKUP_DIR/everfresh_backup_$DATE.db"
  echo "Backup created: $BACKUP_DIR/everfresh_backup_$DATE.db"
  
  # Keep only last 30 backups
  cd $BACKUP_DIR
  ls -t *.db | tail -n +31 | xargs -r rm
  echo "Cleaned up old backups (kept last 30)"
else
  echo "Error: Database file not found"
  exit 1
fi
